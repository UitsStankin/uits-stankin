import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { problemResponse, publicTeacherHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import TeachersPage from './index';

const TEACHERS_URL = '*/api/public/teachers';
const ROUTE = '/about/employee/teachers';

/** Ответ `500` вместо списка — то, что на живом бэкенде не воспроизвести. */
function respondWithServerError() {
  server.use(
    http.get(TEACHERS_URL, () =>
      problemResponse(500, {
        title: 'Internal Server Error',
        detail: 'Что-то пошло не так на сервере',
        instance: '/api/public/teachers',
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
 * Список ППС целиком: адрес → запрос → разметка.
 *
 * Проверяется страница, а не хук: состояний у неё шесть, различаются они
 * не полями модели, а тем, что видит человек, и половина из них — ветки,
 * до которых на живом бэкенде не добраться.
 *
 * Фикстура — двадцать три карточки по алфавиту фамилий (`shared/api/mocks/
 * teachers.ts`): на первой странице Абрамов…Родионова, на второй остаются
 * трое.
 */
describe('TeachersPage', () => {
  it('показывает скелет, потом первую страницу списка', async () => {
    renderWithProviders(<TeachersPage />, { route: ROUTE });

    expect(screen.getByText('Загрузка списка преподавателей')).toBeInTheDocument();

    expect(await screen.findByText('Абрамов Никита Сергеевич')).toBeInTheDocument();
    expect(screen.getByText('Родионова Алла Тимофеевна')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка списка преподавателей')).not.toBeInTheDocument();

    // Двадцать первый — уже на второй странице: размер страницы держит
    // контракт, а не фронт.
    expect(screen.queryByText('Соколов Денис Игоревич')).not.toBeInTheDocument();
  });

  /**
   * Подпись под именем собирается из трёх полей, два из которых бывают
   * пустыми. Проверяются обе крайности: полная строка и должность в одиночку
   * — у ассистента ни степени, ни звания нет, и строка не должна ни
   * начинаться с запятой, ни висеть пустой.
   */
  it('собирает подпись из должности, степени и звания', async () => {
    renderWithProviders(<TeachersPage />, { route: ROUTE });

    expect(await screen.findByText('Абрамов Никита Сергеевич')).toBeInTheDocument();

    // Ищется внутри своей карточки, а не по всей странице: должности,
    // степени и звания в фикстуре раздаются по кругу, и одна и та же подпись
    // стоит под несколькими именами — как и на настоящей кафедре.
    expect(
      within(cardOf('Абрамов Никита Сергеевич')).getByText(
        'доцент кафедры, кандидат технических наук, доцент',
      ),
    ).toBeInTheDocument();

    expect(within(cardOf('Зайцева Полина Максимовна')).getByText('ассистент')).toBeInTheDocument();
  });

  /** `patronymic` контракт разрешает пустым — и ФИО не дописывает « null». */
  it('показывает карточку без отчества без пустого места в имени', async () => {
    renderWithProviders(<TeachersPage />, { route: ROUTE });

    expect(await screen.findByText('Гаврилов Степан')).toBeInTheDocument();
  });

  it('ведёт карточкой на страницу преподавателя', async () => {
    renderWithProviders(<TeachersPage />, { route: ROUTE });

    const link = await screen.findByRole('link', { name: 'Абрамов Никита Сергеевич' });
    expect(link).toHaveAttribute('href', '/about/employee/teachers/1');
  });

  it('открывает страницу из адреса и отмечает её в пагинаторе', async () => {
    renderWithProviders(<TeachersPage />, { route: `${ROUTE}?page=2` });

    expect(await screen.findByText('Соколов Денис Игоревич')).toBeInTheDocument();
    expect(screen.getByText('Фёдоров Максим Эдуардович')).toBeInTheDocument();
    expect(screen.queryByText('Абрамов Никита Сергеевич')).not.toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  it('на мусор в номере страницы показывает первую', async () => {
    renderWithProviders(<TeachersPage />, { route: `${ROUTE}?page=abc` });

    expect(await screen.findByText('Абрамов Никита Сергеевич')).toBeInTheDocument();
  });

  it('на пустом списке объясняет, что карточек нет', async () => {
    server.use(...publicTeacherHandlers([]));

    renderWithProviders(<TeachersPage />, { route: ROUTE });

    expect(await screen.findByText('Преподавателей пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * Страница за пределами данных — не ошибка: контракт отвечает на неё `200`
   * с пустым `content`. Отличить её от пустого раздела можно только
   * по `totalPages`, и это ровно то место, где легко показать
   * «преподавателей нет» вместо «такой страницы нет».
   */
  it('за пределами данных зовёт на первую страницу, а не показывает пустоту', async () => {
    renderWithProviders(<TeachersPage />, { route: `${ROUTE}?page=3` });

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К первой странице' })).toBeInTheDocument();
    expect(screen.queryByText('Преподавателей пока нет')).not.toBeInTheDocument();
  });

  /**
   * Пауза — третье состояние Query помимо загрузки и ошибки: `error` при ней
   * `null`, а `isLoading` уже снят. Ветка отдельная не для красоты — на этом
   * в личном кабинете молча исчезала целая секция (D-F11).
   */
  it('без сети объясняет, что связи нет, а не показывает пустой раздел', async () => {
    onlineManager.setOnline(false);

    renderWithProviders(<TeachersPage />, { route: ROUTE });

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом, а не диагностикой сервера', async () => {
    respondWithServerError();

    renderWithProviders(<TeachersPage />, { route: ROUTE });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('Не удалось загрузить список преподавателей'),
    ).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();
  });

  it('«Повторить» после сбоя загружает список', async () => {
    respondWithServerError();

    renderWithProviders(<TeachersPage />, { route: ROUTE });

    const retry = await screen.findByRole('button', { name: 'Повторить' });

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(retry);

    expect(await screen.findByText('Абрамов Никита Сергеевич')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
