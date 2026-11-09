import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import { clearSession, setAccessToken } from '@shared/api';
import {
  adminUserHandlers,
  makeProfile,
  problemResponse,
  profileHandlers,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import ToastViewport from '@shared/ui/Toast';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import UsersPage from './index';

const USERS = '*/api/users';
const USER = '*/api/users/:id';

/** Вошедший админ — `petrov` с `id: 1`, тот же, что первый в фикстуре. */
const ADMIN = makeProfile({ id: 1, username: 'petrov', superuser: true, moderator: true });

/**
 * Раздел учёток. Права не проверяются — за них отвечает `RoleRoute`.
 * Вошедший нужен ради одного: своя учётка в форме ведёт себя иначе.
 */
function renderUsers(route = '/admin/users') {
  const queryClient = createTestQueryClient();

  queryClient.setQueryData(authKeys.profile, ADMIN);
  setAccessToken('test-access-token');
  server.use(...profileHandlers(ADMIN));

  return renderWithProviders(
    <>
      <UsersPage />
      <ToastViewport />
    </>,
    { route, queryClient },
  );
}

/** Запоминает тела запросов, пропуская их дальше, в мок. */
function captureBodies(method: 'post' | 'put', path: string) {
  const bodies: unknown[] = [];

  server.use(
    http[method](path, async ({ request }) => {
      bodies.push(await request.clone().json());

      return undefined;
    }),
  );

  return bodies;
}

beforeEach(() => {
  // Свой мок на каждый тест: он помнит созданное и изменённое.
  server.use(...adminUserHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  clearSession();
});

describe('UsersPage, список', () => {
  it('показывает первую страницу по логину и помечает свою учётку', async () => {
    renderUsers();

    expect(await screen.findByText('abramov')).toBeInTheDocument();
    expect(screen.getByText('(вы)')).toBeInTheDocument();
    // `yakovleva` — последняя по алфавиту, на вторую страницу.
    expect(screen.queryByText('yakovleva')).not.toBeInTheDocument();
  });

  it('называет незаполненное и ни разу не входивших словами', async () => {
    renderUsers();

    const row = (await screen.findByText('egorov')).closest('tr')!;

    expect(within(row).getByText('ФИО не заполнено')).toBeInTheDocument();
    expect(within(row).getByText('не заполнена')).toBeInTheDocument();
    expect(within(row).getByText('ни разу')).toBeInTheDocument();
    expect(within(row).getByText('Пользователь')).toBeInTheDocument();
  });

  it('удаления нет: в строке три действия, и ни одно не удаляет', async () => {
    renderUsers();

    const row = (await screen.findByText('abramov')).closest('tr')!;

    expect(within(row).getAllByRole('button')).toHaveLength(3);
    expect(within(row).queryByRole('button', { name: /Удалить/ })).not.toBeInTheDocument();
  });

  it('отбирает по роли на сервере, а не на клиенте', async () => {
    const seen: string[] = [];
    server.use(
      http.get(USERS, ({ request }) => {
        seen.push(new URL(request.url).search);

        return undefined;
      }),
    );

    renderUsers('/admin/users?role=moderator');

    expect(await screen.findByText('andreeva')).toBeInTheDocument();
    expect(screen.queryByText('abramov')).not.toBeInTheDocument();
    expect(seen.at(-1)).toContain('role=moderator');
    expect(screen.getByRole('link', { name: 'Модераторы' })).toHaveAttribute('aria-current', 'page');
  });

  it('показывает заблокированных по отбору из адреса', async () => {
    renderUsers('/admin/users?active=false');

    expect(await screen.findByText('grigorieva')).toBeInTheDocument();
    expect(screen.getAllByText('Заблокирована')).toHaveLength(3);
    expect(screen.queryByText('Действует')).not.toBeInTheDocument();
  });

  it('ссылка отбора сохраняет поиск и порядок и сбрасывает страницу', async () => {
    renderUsers('/admin/users?q=ova&sort=dateJoined,desc&page=2');

    const link = await screen.findByRole('link', { name: 'Преподаватели' });

    expect(link).toHaveAttribute('href', '/admin/users?q=ova&role=teacher&sort=dateJoined,desc');
  });

  it('ищет набранное после паузы и говорит, сколько нашлось', async () => {
    renderUsers();

    await screen.findByText('abramov');
    fireEvent.change(screen.getByLabelText('Поиск учётных записей'), {
      target: { value: 'Соколов' },
    });

    expect(await screen.findByText('Найдено учётных записей: 1')).toBeInTheDocument();
    expect(screen.getByText('sokolov')).toBeInTheDocument();
    expect(screen.queryByText('abramov')).not.toBeInTheDocument();
  });

  it('пустая выдача по отбору предлагает показать всех', async () => {
    renderUsers('/admin/users?q=никого-такого');

    expect(await screen.findByText('Никого не нашлось')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Показать всех' })).toHaveAttribute(
      'href',
      '/admin/users',
    );
  });

  it('объясняет страницу за пределами данных', async () => {
    renderUsers('/admin/users?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(
        USERS,
        () =>
          problemResponse(500, {
            title: 'Internal Server Error',
            detail: 'Внутренняя ошибка сервера.',
            instance: '/api/users',
          }),
        { once: true },
      ),
    );

    renderUsers();

    expect(await screen.findByText('Не удалось загрузить учётные записи')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Повторить/ }));

    expect(await screen.findByText('abramov')).toBeInTheDocument();
  });

  it('меняет порядок кликом по заголовку', async () => {
    renderUsers();

    fireEvent.click(await screen.findByRole('button', { name: /Учётная запись/ }));

    expect(await screen.findByText('yakovleva')).toBeInTheDocument();
  });
});

describe('UsersPage, создание', () => {
  async function openCreate() {
    renderUsers();
    await screen.findByText('abramov');
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }));

    return screen.getByRole('dialog', { name: 'Новая учётная запись' });
  }

  function fill(dialog: HTMLElement, label: string, value: string) {
    fireEvent.change(within(dialog).getByLabelText(label), { target: { value } });
  }

  it('проверяет пустую форму до запроса', async () => {
    const bodies = captureBodies('post', USERS);
    const dialog = await openCreate();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

    expect(await within(dialog).findByText('Укажите логин')).toBeInTheDocument();
    expect(within(dialog).getByText('Пароль должен быть минимум 8 символов')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  /**
   * Предел bcrypt — в байтах: 36 русских букв это ровно 72 байта
   * и проходят, 37 — уже нет, хотя символов меньше сорока.
   */
  it('считает длину пароля в байтах, а не в символах', async () => {
    const dialog = await openCreate();

    fill(dialog, 'Пароль', 'я'.repeat(37));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

    expect(await within(dialog).findByText(/не больше 72 байт/)).toBeInTheDocument();

    fill(dialog, 'Пароль', 'я'.repeat(36));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

    await waitFor(() => expect(within(dialog).queryByText(/не больше 72 байт/)).not.toBeInTheDocument());
  });

  it('не пускает несовпавший повтор пароля', async () => {
    const dialog = await openCreate();

    fill(dialog, 'Логин', 'novikov');
    fill(dialog, 'Пароль', 'секретный-пароль');
    fill(dialog, 'Повтор пароля', 'секретный-парол');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

    expect(await within(dialog).findByText('Пароли не совпадают')).toBeInTheDocument();
  });

  it('создаёт учётку: тело без active и без повтора, тост, строка в списке', async () => {
    const bodies = captureBodies('post', USERS);
    const dialog = await openCreate();

    fill(dialog, 'Логин', 'aaa-novikov');
    fill(dialog, 'Пароль', 'секретный-пароль');
    fill(dialog, 'Повтор пароля', 'секретный-пароль');
    fill(dialog, 'Фамилия', 'Новиков');
    fireEvent.click(within(dialog).getByLabelText('Преподаватель'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Учётная запись «aaa-novikov» создана')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        username: 'aaa-novikov',
        password: 'секретный-пароль',
        email: null,
        firstName: null,
        lastName: 'Новиков',
        superuser: false,
        moderator: false,
        teacher: true,
      },
    ]);
    expect(await screen.findByText('aaa-novikov')).toBeInTheDocument();
  });

  it('кладёт занятый логин под поле, а не в баннер', async () => {
    const dialog = await openCreate();

    fill(dialog, 'Логин', 'abramov');
    fill(dialog, 'Пароль', 'секретный-пароль');
    fill(dialog, 'Повтор пароля', 'секретный-пароль');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Создать' }));

    expect(await within(dialog).findByText('Логин уже занят: abramov')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Логин')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('UsersPage, правка', () => {
  async function openEdit(username: string) {
    renderUsers();
    await screen.findByText('abramov');
    fireEvent.click(screen.getByRole('button', { name: `Править учётную запись «${username}»` }));

    return screen.getByRole('dialog', { name: 'Правка учётной записи' });
  }

  it('блокирует учётку: в теле все четыре флага, в списке — «Заблокирована»', async () => {
    const bodies = captureBodies('put', USER);
    const dialog = await openEdit('abramov');

    expect(within(dialog).queryByLabelText('Логин')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('Действует'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Учётная запись «abramov» сохранена')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        email: 'abramov@stankin.ru',
        firstName: 'Никита',
        lastName: 'Абрамов',
        superuser: false,
        moderator: false,
        teacher: true,
        active: false,
      },
    ]);

    const row = screen.getByText('abramov').closest('tr')!;
    expect(await within(row).findByText('Заблокирована')).toBeInTheDocument();
  });

  it('себе не даёт снять права и заблокироваться, но правку сохраняет', async () => {
    const bodies = captureBodies('put', USER);
    const dialog = await openEdit('petrov');

    expect(within(dialog).getByLabelText('Администратор')).toBeDisabled();
    expect(within(dialog).getByLabelText('Действует')).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText('Имя'), { target: { value: 'Пётр Ильич' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Учётная запись «petrov» сохранена')).toBeInTheDocument();
    expect(bodies[0]).toMatchObject({ firstName: 'Пётр Ильич', superuser: true, active: true });
  });

  it('кладёт 409 привязанной карточки под флажок «Преподаватель»', async () => {
    const detail = 'К учётной записи привязана карточка преподавателя id=3, сначала отвязать её';
    server.use(
      http.put(USER, () =>
        problemResponse(409, { title: 'Conflict', detail, instance: '/api/users/101' }),
      ),
    );
    const dialog = await openEdit('abramov');

    fireEvent.click(within(dialog).getByLabelText('Преподаватель'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));

    expect(await within(dialog).findByText(detail)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Преподаватель')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('отказ без словаря показывает баннером', async () => {
    const detail = 'Нельзя снять с себя права администратора или заблокировать себя';
    server.use(
      http.put(USER, () =>
        problemResponse(400, { title: 'Bad Request', detail, instance: '/api/users/1' }),
      ),
    );
    const dialog = await openEdit('abramov');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(detail);
  });
});

describe('UsersPage, пароль и сессии', () => {
  it('сбрасывает пароль: тело только с новым паролем, тост', async () => {
    const bodies = captureBodies('post', '*/api/users/:id/reset-password');
    renderUsers();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Сменить пароль учётной записи «abramov»' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Новый пароль для «abramov»' });

    fireEvent.change(within(dialog).getByLabelText('Новый пароль'), {
      target: { value: 'новый-пароль' },
    });
    fireEvent.change(within(dialog).getByLabelText('Повтор пароля'), {
      target: { value: 'другой-пароль' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сменить пароль' }));

    expect(await within(dialog).findByText('Пароли не совпадают')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText('Повтор пароля'), {
      target: { value: 'новый-пароль' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сменить пароль' }));

    expect(await screen.findByText('Пароль учётной записи «abramov» изменён')).toBeInTheDocument();
    expect(bodies).toEqual([{ newPassword: 'новый-пароль' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('завершает сессии после подтверждения', async () => {
    let calls = 0;
    server.use(
      http.post('*/api/users/101/logout', () => {
        calls += 1;

        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderUsers();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Завершить сессии учётной записи «abramov»' }),
    );
    expect(calls).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }));

    expect(await screen.findByText('Сессии учётной записи «abramov» завершены')).toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('о своей учётке предупреждает, что выйдешь сам', async () => {
    renderUsers();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Завершить сессии учётной записи «petrov»' }),
    );

    expect(screen.getByText(/вы выйдете из портала на всех устройствах/)).toBeInTheDocument();
  });

  it('показывает отказ завершения тостом', async () => {
    server.use(
      http.post('*/api/users/:id/logout', () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Пользователь id=101 не найден',
          instance: '/api/users/101/logout',
        }),
      ),
    );
    renderUsers();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Завершить сессии учётной записи «abramov»' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Завершить' }));

    expect(await screen.findByText('Пользователь id=101 не найден')).toBeInTheDocument();
  });
});

/** Пустой мок — не пустой раздел: не заданный отбор даёт свою подпись. */
describe('UsersPage, пустой список', () => {
  it('говорит, что учёток нет вовсе', async () => {
    server.use(...adminUserHandlers([]));

    renderUsers();

    expect(await screen.findByText('Учётных записей пока нет')).toBeInTheDocument();
  });

});
