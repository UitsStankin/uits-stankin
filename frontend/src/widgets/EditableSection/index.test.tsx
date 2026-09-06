import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { editablePageHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import EditableSection from './index';

const PAGE_URL = '*/api/public/pages/fields-of-study';

/** Раздел по слагу — так его ставят и страницы F-23, и контакты. */
function renderSection() {
  return renderWithProviders(<EditableSection slug="fields-of-study" />);
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
 * Редактируемый раздел: слаг → запрос → разметка.
 *
 * Проверяется виджет, а не хук: состояний шесть, различаются они тем,
 * что видит человек, и половина из них — ветки, до которых на живом
 * бэкенде не добраться. Сам рендер Markdown (XSS, ссылки, таблицы)
 * здесь не перепроверяется — это граница `shared/ui/Markdown`, проверенная
 * с F-17; разделу достаточно доказать, что текст уходит именно туда.
 *
 * Проверки лежат здесь, а не в страницах, которые виджет ставят: до F-32
 * они и были в `pages/EditablePagePage`, потому что раздел был всем её
 * содержимым. Теперь мест три (девять адресов F-23, контакты, впереди
 * аспирантура), и шесть состояний — общее поведение одного виджета,
 * а не совпадение трёх страниц. Страницам осталось доказать своё:
 * что слаг уходит нужный, а вокруг него встаёт их собственная вёрстка.
 */
describe('EditableSection', () => {
  it('показывает скелет, потом раздел разметкой', async () => {
    respondWithText('## Бакалавриат\n\nПрограмма «Прикладная информатика».');

    renderSection();

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

    renderSection();

    expect(await screen.findByText('Текст раздела')).toBeInTheDocument();
    expect(screen.queryByText('fields-of-study')).not.toBeInTheDocument();
  });

  /**
   * Умолчание моков — `text: ''` у всех разделов: ровно так выглядит чистая
   * база после ченджсета `008-seed-editable-pages`. Страница обязана
   * объяснить пустоту, а не показать заголовок над пустым местом.
   */
  it('на незаполненном разделе объясняет пустоту', async () => {
    renderSection();

    expect(await screen.findByText('Раздел пока не заполнен')).toBeInTheDocument();
  });

  /** Строка из одних пробелов — то же «не заполнено», а не пустая карточка. */
  it('раздел из одних пробелов считает незаполненным', async () => {
    respondWithText('  \n\n\t');

    renderSection();

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

    renderSection();

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

    renderSection();

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

    renderSection();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});
