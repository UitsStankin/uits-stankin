import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { editablePageHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import EditablePagePage from './index';

const PAGE_URL = '*/api/public/pages/fields-of-study';

/** Страница одного раздела — слаг и заголовок, как в таблице роутов. */
function renderPage() {
  return renderWithProviders(
    <EditablePagePage slug="fields-of-study" heading="Направления подготовки" />,
  );
}

/** Раздел с заданным текстом — поверх умолчания моков, где все разделы пусты. */
function respondWithText(text: string) {
  server.use(...editablePageHandlers({ 'fields-of-study': text }));
}

afterEach(() => {
  // Сеть возвращается всем: `onlineManager` — глобальный синглтон Query,
  // и оставленный офлайн поставил бы на паузу запросы соседнего теста.
  onlineManager.setOnline(true);
});

/**
 * Страница редактируемого раздела: слаг → запрос → разметка.
 *
 * Проверяется страница, а не хук: состояний шесть, различаются они тем,
 * что видит человек, и половина из них — ветки, до которых на живом
 * бэкенде не добраться. Сам рендер Markdown (XSS, ссылки, таблицы)
 * здесь не перепроверяется — это граница `shared/ui/Markdown`, проверенная
 * с F-17; странице достаточно доказать, что текст уходит именно туда.
 */
describe('EditablePagePage', () => {
  it('показывает скелет, потом раздел разметкой', async () => {
    respondWithText('## Бакалавриат\n\nПрограмма «Прикладная информатика».');

    renderPage();

    // Заголовок — константа страницы, он на месте с первого кадра.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Направления подготовки' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Загрузка раздела')).toBeInTheDocument();

    // `##` стал заголовком — значит, текст ушёл в Markdown, а не выведен строкой.
    expect(await screen.findByRole('heading', { level: 2, name: 'Бакалавриат' })).toBeInTheDocument();
    expect(screen.getByText('Программа «Прикладная информатика».')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка раздела')).not.toBeInTheDocument();
  });

  /**
   * `title` из ответа — подпись раздела для списка в админке, контракт
   * прямо запрещает рисовать её над текстом. Мок кладёт в `title` слаг,
   * так что появление этой строки на странице тест и ловит.
   */
  it('не рисует подпись раздела из ответа', async () => {
    respondWithText('Текст раздела');

    renderPage();

    expect(await screen.findByText('Текст раздела')).toBeInTheDocument();
    expect(screen.queryByText('fields-of-study')).not.toBeInTheDocument();
  });

  /**
   * Умолчание моков — `text: ''` у всех разделов: ровно так выглядит чистая
   * база после ченджсета `008-seed-editable-pages`. Страница обязана
   * объяснить пустоту, а не показать заголовок над пустым местом.
   */
  it('на незаполненном разделе объясняет пустоту', async () => {
    renderPage();

    expect(await screen.findByText('Раздел пока не заполнен')).toBeInTheDocument();
  });

  /** Строка из одних пробелов — то же «не заполнено», а не пустая карточка. */
  it('раздел из одних пробелов считает незаполненным', async () => {
    respondWithText('  \n\n\t');

    renderPage();

    expect(await screen.findByText('Раздел пока не заполнен')).toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом, «Повторить» чинит', async () => {
    server.use(
      http.get(PAGE_URL, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/public/pages/fields-of-study',
        }),
      ),
    );

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить раздел')).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();

    // Бэкенд «починился»: свежий хендлер встаёт поверх ошибки.
    respondWithText('Текст после починки');
    fireEvent.click(within(alert).getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Текст после починки')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * `404` по известному слагу — не битая ссылка, а не доехавшая до стенда
   * миграция: страница показывает тот же сбой, что и на `500`, а не
   * «раздела не существует» — посетителю, пришедшему из меню, такая
   * надпись звучала бы как сломанный портал.
   */
  it('на 404 не доехавшей миграции показывает сбой, а не «не найдено»', async () => {
    server.use(
      http.get(PAGE_URL, () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Раздел не найден',
          instance: '/api/public/pages/fields-of-study',
        }),
      ),
    );

    renderPage();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить раздел')).toBeInTheDocument();
    // У 4xx показывается `detail` сервера — здесь он объясняет, чего именно нет.
    expect(within(alert).getByText('Раздел не найден')).toBeInTheDocument();
  });

  /**
   * Пауза — третье состояние Query помимо загрузки и ошибки: `error` при
   * ней `null`, а `isLoading` уже снят. На пропущенной ветке в личном
   * кабинете молча исчезала целая секция (D-F11).
   */
  it('без сети объясняет, что связи нет, а не показывает пустой раздел', async () => {
    onlineManager.setOnline(false);

    renderPage();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});
