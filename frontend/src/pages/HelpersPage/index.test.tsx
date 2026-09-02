import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { problemResponse, publicHelperHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import HelpersPage from './index';

const HELPERS_URL = '*/api/public/helpers';
const ROUTE = '/about/employee/uvp';

/** Ответ `500` вместо списка — то, что на живом бэкенде не воспроизвести. */
function respondWithServerError() {
  server.use(
    http.get(HELPERS_URL, () =>
      problemResponse(500, {
        title: 'Internal Server Error',
        detail: 'Что-то пошло не так на сервере',
        instance: '/api/public/helpers',
      }),
    ),
  );
}

/** Карточка целиком — по имени в её заголовке. */
function cardOf(fullName: string): HTMLElement {
  const card = screen.getByText(fullName).closest('article');
  if (card === null) throw new Error(`Карточка «${fullName}» не найдена`);
  return card;
}

afterEach(() => {
  // Сеть возвращается всем: `onlineManager` — глобальный синглтон Query,
  // и оставленный офлайн поставил бы на паузу запросы соседнего теста.
  onlineManager.setOnline(true);
});

/**
 * Список УВП целиком: адрес → запрос → разметка.
 *
 * Проверяется страница, а не хук, по тем же причинам, что у ППС:
 * состояний шесть, различаются они тем, что видит человек, и половина
 * из них — ветки, до которых на живом бэкенде не добраться.
 *
 * Фикстура — двадцать три карточки по алфавиту фамилий (`shared/api/
 * mocks/helpers.ts`): на первой странице Агафонов…Фомин, на второй
 * остаются трое.
 */
describe('HelpersPage', () => {
  it('показывает скелет, потом первую страницу списка', async () => {
    renderWithProviders(<HelpersPage />, { route: ROUTE });

    expect(screen.getByText('Загрузка списка сотрудников')).toBeInTheDocument();

    expect(await screen.findByText('Агафонов Виктор Николаевич')).toBeInTheDocument();
    expect(screen.getByText('Фомин Руслан Айратович')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка списка сотрудников')).not.toBeInTheDocument();

    // Двадцать первая — уже на второй странице: размер страницы держит
    // контракт, а не фронт.
    expect(screen.queryByText('Цветкова Лидия Степановна')).not.toBeInTheDocument();
  });

  /**
   * Под именем — одна должность: ни степеней, ни званий у УВП нет,
   * подпись не собирается, а приходит готовой строкой.
   */
  it('показывает должность под именем', async () => {
    renderWithProviders(<HelpersPage />, { route: ROUTE });

    expect(await screen.findByText('Агафонов Виктор Николаевич')).toBeInTheDocument();

    // Ищется внутри своей карточки: должности в фикстуре раздаются
    // по кругу, и одна и та же стоит под несколькими именами.
    expect(
      within(cardOf('Агафонов Виктор Николаевич')).getByText('инженер кафедры'),
    ).toBeInTheDocument();
  });

  /** `patronymic` контракт разрешает пустым — и ФИО не дописывает « null». */
  it('показывает карточку без отчества без пустого места в имени', async () => {
    renderWithProviders(<HelpersPage />, { route: ROUTE });

    expect(await screen.findByText('Жарова Тамара')).toBeInTheDocument();
  });

  /**
   * Карточка — не ссылка: детальной страницы у УВП нет, и имя, ставшее
   * ссылкой, обещало бы клик в никуда. Тест сторожит отличие от списка
   * ППС, где ссылкой кликается вся карточка.
   */
  it('не делает карточку ссылкой', async () => {
    renderWithProviders(<HelpersPage />, { route: ROUTE });

    expect(await screen.findByText('Агафонов Виктор Николаевич')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Агафонов Виктор Николаевич' }),
    ).not.toBeInTheDocument();
  });

  it('открывает страницу из адреса и отмечает её в пагинаторе', async () => {
    renderWithProviders(<HelpersPage />, { route: `${ROUTE}?page=2` });

    expect(await screen.findByText('Цветкова Лидия Степановна')).toBeInTheDocument();
    expect(screen.getByText('Юдина Валерия Константиновна')).toBeInTheDocument();
    expect(screen.queryByText('Агафонов Виктор Николаевич')).not.toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  it('на мусор в номере страницы показывает первую', async () => {
    renderWithProviders(<HelpersPage />, { route: `${ROUTE}?page=abc` });

    expect(await screen.findByText('Агафонов Виктор Николаевич')).toBeInTheDocument();
  });

  it('на пустом списке объясняет, что карточек нет', async () => {
    server.use(...publicHelperHandlers([]));

    renderWithProviders(<HelpersPage />, { route: ROUTE });

    expect(await screen.findByText('Сотрудников пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * Страница за пределами данных — не ошибка: контракт отвечает на неё
   * `200` с пустым `content`, и отличить её от пустого раздела можно
   * только по `totalPages`.
   */
  it('за пределами данных зовёт на первую страницу, а не показывает пустоту', async () => {
    renderWithProviders(<HelpersPage />, { route: `${ROUTE}?page=3` });

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К первой странице' })).toBeInTheDocument();
    expect(screen.queryByText('Сотрудников пока нет')).not.toBeInTheDocument();
  });

  /**
   * Пауза — третье состояние Query помимо загрузки и ошибки: `error` при
   * ней `null`, а `isLoading` уже снят. На пропущенной ветке в личном
   * кабинете молча исчезала целая секция (D-F11).
   */
  it('без сети объясняет, что связи нет, а не показывает пустой раздел', async () => {
    onlineManager.setOnline(false);

    renderWithProviders(<HelpersPage />, { route: ROUTE });

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом, а не диагностикой сервера', async () => {
    respondWithServerError();

    renderWithProviders(<HelpersPage />, { route: ROUTE });

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить список сотрудников')).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();
  });

  it('«Повторить» после сбоя загружает список', async () => {
    respondWithServerError();

    renderWithProviders(<HelpersPage />, { route: ROUTE });

    const retry = await screen.findByRole('button', { name: 'Повторить' });

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(retry);

    expect(await screen.findByText('Агафонов Виктор Николаевич')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
