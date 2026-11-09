import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fileHandlers, helperHandlers, makeHelper, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { HelperRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import AdminHelpersPage from './index';

const PUBLIC_HELPERS = '*/api/public/helpers';
const HELPERS = '*/api/helpers';

/**
 * Раздел УВП админки.
 *
 * Прав здесь не проверяют: за них отвечает `RoleRoute`, и у него свои
 * шесть проверок. Уголок тостов монтируется рядом — сообщение об успехе
 * и об отказе часть поведения раздела.
 */
function renderHelpers(route = '/admin/helpers') {
  return renderWithProviders(
    <>
      <AdminHelpersPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/** Свой список на каждый тест: мок помнит, что в нём создали и удалили. */
beforeEach(() => {
  server.use(...helperHandlers(), ...fileHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

/** Строка таблицы, в которой лежит карточка с таким ФИО. */
function rowOf(fullName: string) {
  const cell = screen.getByRole('cell', { name: fullName });
  const row = cell.closest('tr');

  if (!row) throw new Error(`строки с карточкой «${fullName}» нет в разметке`);

  return within(row);
}

describe('AdminHelpersPage, список', () => {
  it('показывает карточки первой страницы по алфавиту фамилий', async () => {
    renderHelpers();

    expect(await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' })).toBeInTheDocument();
    expect(rowOf('Агафонов Виктор Николаевич').getByRole('cell', { name: 'инженер кафедры' })).toBeInTheDocument();

    // Двадцать первая карточка — уже на второй странице.
    expect(screen.queryByRole('cell', { name: 'Цветкова Лидия Степановна' })).not.toBeInTheDocument();
  });

  it('открывает вторую страницу из адреса', async () => {
    renderHelpers('/admin/helpers?page=2');

    expect(await screen.findByRole('cell', { name: 'Цветкова Лидия Степановна' })).toBeInTheDocument();
  });

  it('запрашивает обратный порядок, когда он задан в адресе', async () => {
    renderHelpers('/admin/helpers?sort=lastName,desc');

    expect(await screen.findByRole('cell', { name: 'Юдина Валерия Константиновна' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Агафонов Виктор Николаевич' })).not.toBeInTheDocument();
  });

  /**
   * Заданный порядок заменяет умолчание контракта целиком, вместе
   * с ключами `firstName` и `id`, которые делают листание устойчивым.
   * Свой «такой же» порядок ломал бы его молча.
   */
  it('не отправляет порядок по умолчанию', async () => {
    let requested: string | null = null;
    server.use(
      http.get(PUBLIC_HELPERS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderHelpers();
    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });

    expect(requested).not.toContain('sort=');
  });

  it('меняет порядок кликом по заголовку колонки', async () => {
    renderHelpers();

    fireEvent.click(await screen.findByRole('button', { name: /ФИО/ }));

    expect(await screen.findByRole('cell', { name: 'Юдина Валерия Константиновна' })).toBeInTheDocument();
  });

  it('говорит, что карточек нет вовсе', async () => {
    server.use(...helperHandlers([]));

    renderHelpers();

    expect(await screen.findByText('Карточек пока нет')).toBeInTheDocument();
  });

  /** Страница за пределами данных — `200` с пустым `content`, а не ошибка. */
  it('объясняет страницу за пределами данных', async () => {
    renderHelpers('/admin/helpers?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(PUBLIC_HELPERS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/public/helpers',
        }),
      ),
    );

    renderHelpers();

    expect(await screen.findByText('Не удалось загрузить сотрудников')).toBeInTheDocument();

    server.use(...helperHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' })).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderHelpers();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

/**
 * Форма карточки: создание, правка, удаление.
 *
 * Список короткий, а не фикстура целиком: созданная карточка встаёт
 * по алфавиту, и на списке из двадцати трёх фамилий её место зависело бы
 * от выбранной фамилии, а не от кода.
 */
describe('AdminHelpersPage, форма', () => {
  beforeEach(() => {
    server.use(
      ...helperHandlers([
        makeHelper({
          id: 1,
          lastName: 'Агафонов',
          firstName: 'Виктор',
          patronymic: 'Николаевич',
          position: 'инженер кафедры',
          avatar: 'avatars/2026/08/c7d1.jpg',
          avatarUrl: '/media/avatars/2026/08/c7d1.jpg',
        }),
      ]),
      ...fileHandlers(),
    );
  });

  /** Форма живёт окном: догружать нечего, вся карточка лежит в строке. */
  function openCreate() {
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    return within(screen.getByRole('dialog', { name: 'Новая карточка' }));
  }

  it('заводит карточку и показывает её в таблице', async () => {
    renderHelpers();

    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });

    const form = openCreate();
    fireEvent.change(form.getByLabelText('Фамилия'), { target: { value: 'Боброва' } });
    fireEvent.change(form.getByLabelText('Имя'), { target: { value: 'Людмила' } });
    fireEvent.change(form.getByLabelText('Отчество'), { target: { value: 'Ивановна' } });
    fireEvent.change(form.getByLabelText('Должность'), { target: { value: 'лаборант' } });
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByRole('cell', { name: 'Боброва Людмила Ивановна' })).toBeInTheDocument();
    expect(screen.getByText('Карточка «Боброва Людмила» создана')).toBeInTheDocument();
  });

  it('не отправляет карточку без обязательных полей', async () => {
    let requested = false;
    server.use(
      http.post(HELPERS, () => {
        requested = true;
      }),
    );

    renderHelpers();
    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });

    const form = openCreate();
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    expect(await form.findByText('Укажите фамилию')).toBeInTheDocument();
    expect(form.getByText('Укажите имя')).toBeInTheDocument();
    expect(form.getByText('Укажите должность')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  it('открывает правку с полями карточки', async () => {
    renderHelpers();

    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });
    fireEvent.click(
      rowOf('Агафонов Виктор Николаевич').getByRole('button', {
        name: 'Править карточку «Агафонов Виктор Николаевич»',
      }),
    );

    const form = within(screen.getByRole('dialog', { name: 'Правка карточки' }));

    expect(form.getByLabelText('Фамилия')).toHaveValue('Агафонов');
    expect(form.getByLabelText('Должность')).toHaveValue('инженер кафедры');
    expect(form.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  });

  /**
   * Тело `PUT` целиком: ручка — полная замена, и ключ фото, не пришедший
   * в теле, удалил бы фотографию с диска. Глазами этого не видно — форма
   * выглядит одинаково и когда отправляет ключ, и когда забыла его.
   */
  it('отправляет ключ фото обратно при правке', async () => {
    let body: HelperRequest | null = null;
    server.use(
      http.put(`${HELPERS}/:id`, async ({ request }) => {
        body = (await request.json()) as HelperRequest;

        return HttpResponse.json(makeHelper());
      }),
    );

    renderHelpers();

    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });
    fireEvent.click(
      rowOf('Агафонов Виктор Николаевич').getByRole('button', {
        name: 'Править карточку «Агафонов Виктор Николаевич»',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Правка карточки' })).getByRole('button', {
        name: 'Сохранить',
      }),
    );

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ avatar: 'avatars/2026/08/c7d1.jpg', patronymic: 'Николаевич' });
  });

  /**
   * Кнопка удаления фото есть, в отличие от личного кабинета: это чужая
   * карточка, и снять фото уволившегося сотрудника надо уметь.
   */
  it('снимает фото и отправляет пустой ключ', async () => {
    let body: HelperRequest | null = null;
    server.use(
      http.put(`${HELPERS}/:id`, async ({ request }) => {
        body = (await request.json()) as HelperRequest;

        return HttpResponse.json(makeHelper());
      }),
    );

    renderHelpers();

    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });
    fireEvent.click(
      rowOf('Агафонов Виктор Николаевич').getByRole('button', {
        name: 'Править карточку «Агафонов Виктор Николаевич»',
      }),
    );

    const form = within(screen.getByRole('dialog', { name: 'Правка карточки' }));
    fireEvent.click(form.getByRole('button', { name: 'Удалить фото' }));
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ avatar: null });
  });

  /** Незаполненное отчество уходит как `null`, а не пустой строкой. */
  it('отправляет незаполненное отчество как null', async () => {
    let body: HelperRequest | null = null;
    server.use(
      http.post(HELPERS, async ({ request }) => {
        body = (await request.json()) as HelperRequest;

        return HttpResponse.json(makeHelper({ id: 2 }), { status: 201 });
      }),
    );

    renderHelpers();
    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });

    const form = openCreate();
    fireEvent.change(form.getByLabelText('Фамилия'), { target: { value: 'Жарова' } });
    fireEvent.change(form.getByLabelText('Имя'), { target: { value: 'Тамара' } });
    fireEvent.change(form.getByLabelText('Должность'), { target: { value: 'методист' } });
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ patronymic: null });
  });

  it('показывает баннером отказ сервера', async () => {
    server.use(
      http.post(HELPERS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Файл не найден в хранилище',
          instance: '/api/helpers',
        }),
      ),
    );

    renderHelpers();
    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });

    const form = openCreate();
    fireEvent.change(form.getByLabelText('Фамилия'), { target: { value: 'Боброва' } });
    fireEvent.change(form.getByLabelText('Имя'), { target: { value: 'Людмила' } });
    fireEvent.change(form.getByLabelText('Должность'), { target: { value: 'лаборант' } });
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    expect(await form.findByText('Файл не найден в хранилище')).toBeInTheDocument();
  });

  it('удаляет карточку после подтверждения', async () => {
    renderHelpers();

    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });
    fireEvent.click(
      rowOf('Агафонов Виктор Николаевич').getByRole('button', {
        name: 'Удалить карточку «Агафонов Виктор Николаевич»',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Удалить карточку сотрудника?' })).getByRole(
        'button',
        { name: 'Удалить' },
      ),
    );

    expect(await screen.findByText('Карточек пока нет')).toBeInTheDocument();
    expect(screen.getByText('Карточка «Агафонов Виктор» удалена')).toBeInTheDocument();
  });

  it('не удаляет по «Отмене»', async () => {
    renderHelpers();

    await screen.findByRole('cell', { name: 'Агафонов Виктор Николаевич' });
    fireEvent.click(
      rowOf('Агафонов Виктор Николаевич').getByRole('button', {
        name: 'Удалить карточку «Агафонов Виктор Николаевич»',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Удалить карточку сотрудника?' })).getByRole(
        'button',
        { name: 'Отмена' },
      ),
    );

    expect(screen.getByRole('cell', { name: 'Агафонов Виктор Николаевич' })).toBeInTheDocument();
  });
});
