import { http, HttpResponse } from 'msw';

import type {
  AdminUser,
  UserCreateRequest,
  UserDirectoryEntry,
  UserUpdateRequest,
} from '@shared/types';

import { DEFAULT_PAGE_SIZE, numberParam, pageResponse } from './page';
import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const USER_DIRECTORY = '*/api/users/directory';
const USERS = '*/api/users';
const USER = '*/api/users/:id';
const USER_RESET_PASSWORD = '*/api/users/:id/reset-password';
const USER_LOGOUT = '*/api/users/:id/logout';

/** Запись справочника: `id` и ФИО, больше ручка ничего не отдаёт. */
export function makeUserDirectoryEntry(
  overrides: Partial<UserDirectoryEntry> = {},
): UserDirectoryEntry {
  return { id: 42, lastName: 'Иванов', firstName: 'Иван', ...overrides };
}

/**
 * Двенадцать учёток преподавателей по алфавиту фамилий — столько же,
 * сколько в примере контракта.
 *
 * Меньше, чем карточек ППС (23), и это не небрежность: учётка есть
 * не у каждого преподавателя, и справочник обязан выглядеть короче
 * списка карточек — иначе форма правки создавала бы впечатление, что
 * связь найдётся всегда.
 *
 * У последней записи ФИО не заполнено вовсе: контракт разрешает обе
 * строки `null`, а подпись в выпадающем списке собирает фронт — и на
 * пустом ФИО он обязан показать хоть что-то, а не пустой пункт.
 *
 * `id` начинаются с сотни, чтобы ни один не совпал с `id` карточки ППС:
 * это разные сущности, и тест, перепутавший их местами, обязан упасть,
 * а не сойтись случайно.
 */
export const userDirectoryFixture: readonly UserDirectoryEntry[] = [
  ['Абрамов', 'Никита'],
  ['Андреева', 'Ольга'],
  ['Баранов', 'Илья'],
  ['Волков', 'Артём'],
  ['Григорьева', 'Анна'],
  ['Данилов', 'Кирилл'],
  ['Кузнецова', 'Татьяна'],
  ['Лебедев', 'Виктор'],
  ['Петров', 'Пётр'],
  ['Соколов', 'Денис'],
  ['Фёдоров', 'Максим'],
  [null, null],
].map(([lastName, firstName], index) =>
  makeUserDirectoryEntry({ id: 101 + index, lastName, firstName }),
);

/**
 * Справочник учёток преподавателей — одна ручка чтения.
 *
 * Список берётся аргументом, чтобы тест пустого справочника был одной
 * строкой `server.use(...userDirectoryHandlers([]))`: форма карточки ППС
 * обязана в этом случае сказать, что привязывать не к чему, а не показать
 * пустой выпадающий список.
 *
 * Сортировки мок не повторяет: справочник приходит уже по алфавиту,
 * и фикстура сложена так же — просить у него другой порядок в портале
 * некому.
 */
export function userDirectoryHandlers(
  items: readonly UserDirectoryEntry[] = userDirectoryFixture,
) {
  return [
    http.get(USER_DIRECTORY, ({ request }) => {
      const url = new URL(request.url);

      // Размер страницы у справочника — 50, а не общие 20 (docs/API.md,
      // «Пагинация списков»). Клиент просит сотню и получает всё.
      return HttpResponse.json(
        pageResponse(items, numberParam(url, 'page', 0), numberParam(url, 'size', 50, 1)),
      );
    }),
  ];
}

/**
 * Учётная запись админки со всеми полями контракта. Переопределяется
 * точечно: тесту обычно нужны логин и пара флагов.
 */
export function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    username: 'petrov',
    firstName: 'Пётр',
    lastName: 'Петров',
    email: 'petrov@stankin.ru',
    avatarUrl: null,
    teacher: false,
    moderator: false,
    superuser: false,
    active: true,
    lastLogin: '2026-09-01T10:15:30.123456+03:00',
    dateJoined: '2026-07-01T09:00:00+03:00',
    ...overrides,
  };
}

type Roles = 'a' | 'm' | 't' | 'am' | 'mt' | 'amt' | '';

/**
 * Двадцать три учётки — на три больше страницы, как у остальных фикстур:
 * пагинатор рисуется, `?page=3` попадает за пределы данных.
 *
 * Порядок — по логину, как отдаёт контракт по умолчанию.
 *
 * Первая — `petrov` с `id: 1`, ровно тот, кем входит браузерный мок
 * (`makeProfile`): так в браузере видно, что себе админ не может ни снять
 * права, ни заблокировать себя. Среди остальных есть заблокированные,
 * ни разу не входившие и учётки без ФИО и почты — контракт разрешает
 * все три, и таблица обязана показать их словами, а не пустой ячейкой.
 */
export const adminUsersFixture: readonly AdminUser[] = (
  [
    ['abramov', 'Абрамов', 'Никита', 't', true, true],
    ['andreeva', 'Андреева', 'Ольга', 'mt', true, true],
    ['baranov', 'Баранов', 'Илья', 't', true, true],
    ['belova', 'Белова', 'Дарья', '', true, false],
    ['volkov', 'Волков', 'Артём', 't', true, true],
    ['grigorieva', 'Григорьева', 'Анна', 't', false, true],
    ['danilov', 'Данилов', 'Кирилл', 't', true, true],
    ['egorov', null, null, '', true, false],
    ['zaitseva', 'Зайцева', 'Мария', '', true, true],
    ['ivanova', 'Иванова', 'Елена', 'm', true, true],
    ['kuznetsova', 'Кузнецова', 'Татьяна', 't', true, true],
    ['lebedev', 'Лебедев', 'Виктор', 't', true, true],
    ['morozov', 'Морозов', 'Глеб', '', false, true],
    ['nikitin', 'Никитин', 'Роман', '', true, true],
    ['orlova', 'Орлова', 'Ксения', 'a', true, true],
    ['pavlov', 'Павлов', 'Степан', '', true, false],
    ['petrov', 'Петров', 'Пётр', 'amt', true, true],
    ['romanova', 'Романова', 'Вера', '', true, true],
    ['sokolov', 'Соколов', 'Денис', 't', true, true],
    ['tarasov', 'Тарасов', 'Олег', '', false, true],
    ['fedorov', 'Фёдоров', 'Максим', 't', true, true],
    ['khokhlov', 'Хохлов', 'Ян', '', true, true],
    ['yakovleva', 'Яковлева', 'Алина', 'm', true, true],
  ] as const satisfies readonly (readonly [string, string | null, string | null, Roles, boolean, boolean])[]
)
  .map(([username, lastName, firstName, roles, active, hasLoggedIn], index) =>
    makeAdminUser({
      // `petrov` — первый по `id`, хоть и не по алфавиту: им входит
      // браузерный мок, и у профиля `id: 1`.
      id: username === 'petrov' ? 1 : 101 + index,
      username,
      lastName,
      firstName,
      email: lastName === null ? null : `${username}@stankin.ru`,
      superuser: roles.includes('a'),
      moderator: roles.includes('m'),
      teacher: roles.includes('t'),
      active,
      lastLogin: hasLoggedIn ? `2026-09-${String((index % 9) + 1).padStart(2, '0')}T10:15:30+03:00` : null,
      dateJoined: `2026-0${(index % 3) + 6}-${String((index % 27) + 1).padStart(2, '0')}T09:${String(index).padStart(2, '0')}:00+03:00`,
    }),
  )
  .sort((a, b) => a.username.localeCompare(b.username));

/**
 * Учётные записи для админки: список с отбором, создание, правка, сброс
 * пароля и завершение сессий.
 *
 * Мок **с состоянием**, как у дисциплин: созданная учётка появляется
 * в списке, заблокированная пропадает из выдачи «только действующие».
 *
 * Что мок повторяет из контракта:
 *
 * - отбор `q`, `active` и `role` и сортировку по `username` и `dateJoined` —
 *   на них стоят проверки страницы, и клиентский отбор вместо серверного
 *   был бы тем самым враньём про `totalElements`;
 * - занятый логин — `400` со словарём `errors` под ключом `username`
 *   (T-80): ровно на нём проверяется, что отказ встаёт под поле.
 *
 * Чего не повторяет: «себя не разжаловать» и `409` на снятие роли
 * `teacher` при привязанной карточке. Первое зависит от того, кто вошёл,
 * а мок списка этого не знает; второе — от карточек ППС, которых у этой
 * фикстуры нет. Оба заводятся в тесте через `server.use`.
 *
 * Адреса с `:id` проверяют, что `id` — число, и иначе молчат: под тот же
 * шаблон попадают `/api/users/profile`, `/api/users/directory`
 * и `/api/users/auth/logout`, и мок учёток, положенный поверх набора
 * через `server.use`, перехватывал бы их. Промолчавший обработчик MSW
 * отдаёт следующему.
 */
export function adminUserHandlers(items: readonly AdminUser[] = adminUsersFixture) {
  let current = [...items];
  let nextId = current.reduce((max, user) => Math.max(max, user.id), 0) + 1;

  return [
    http.get(USERS, ({ request }) => {
      const url = new URL(request.url);
      const role = url.searchParams.get('role');

      if (role !== null && !['admin', 'moderator', 'teacher', 'user'].includes(role)) {
        return problemResponse(400, {
          title: 'Bad Request',
          detail: `Неизвестная роль: ${role}`,
          instance: '/api/users',
        });
      }

      const filtered = current.filter(
        (user) =>
          matchesSearch(user, url.searchParams.get('q')) &&
          matchesActive(user, url.searchParams.get('active')) &&
          matchesRole(user, role),
      );

      return HttpResponse.json(
        pageResponse(
          sortUsers(filtered, url.searchParams.get('sort')),
          numberParam(url, 'page', 0),
          numberParam(url, 'size', DEFAULT_PAGE_SIZE, 1),
        ),
      );
    }),

    http.post(USERS, async ({ request }) => {
      const body = (await request.json()) as UserCreateRequest;

      if (current.some((user) => user.username === body.username)) {
        const message = `Логин уже занят: ${body.username}`;

        return problemResponse(400, {
          title: 'Bad Request',
          detail: message,
          instance: '/api/users',
          errors: { username: [message] },
        });
      }

      const created = makeAdminUser({
        id: nextId++,
        username: body.username,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        superuser: body.superuser,
        moderator: body.moderator,
        teacher: body.teacher,
        active: true,
        lastLogin: null,
        dateJoined: '2026-09-12T12:00:00+03:00',
      });
      current = [...current, created];

      return HttpResponse.json(created, {
        status: 201,
        headers: { Location: `/api/users/${created.id}` },
      });
    }),

    http.put(USER, async ({ params, request }) => {
      const id = numericId(params.id);
      if (id === null) return undefined;

      const existing = current.find((user) => user.id === id);
      if (!existing) return notFound(`/api/users/${id}`);

      const body = (await request.json()) as UserUpdateRequest;
      const updated: AdminUser = { ...existing, ...body };
      current = current.map((user) => (user.id === id ? updated : user));

      return HttpResponse.json(updated);
    }),

    http.post(USER_RESET_PASSWORD, ({ params }) => noContentFor(params.id, current)),

    http.post(USER_LOGOUT, ({ params }) => noContentFor(params.id, current)),
  ];
}

function numericId(raw: unknown): number | null {
  return typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : null;
}

/** `204` на существующую учётку, `404` на чужой `id`, молчание на не-число. */
function noContentFor(raw: unknown, users: readonly AdminUser[]) {
  const id = numericId(raw);
  if (id === null) return undefined;

  if (!users.some((user) => user.id === id)) return notFound(`/api/users/${id}`);

  return new HttpResponse(null, { status: 204 });
}

function matchesSearch(user: AdminUser, raw: string | null): boolean {
  const q = raw?.trim().toLowerCase() ?? '';
  if (q === '') return true;

  return [user.username, user.firstName, user.lastName, user.email].some((value) =>
    value?.toLowerCase().includes(q),
  );
}

function matchesActive(user: AdminUser, raw: string | null): boolean {
  if (raw === 'true') return user.active;
  if (raw === 'false') return !user.active;

  return true;
}

function matchesRole(user: AdminUser, role: string | null): boolean {
  switch (role) {
    case 'admin':
      return user.superuser;
    case 'moderator':
      return user.moderator;
    case 'teacher':
      return user.teacher;
    case 'user':
      return !user.superuser && !user.moderator && !user.teacher;
    default:
      return true;
  }
}

/**
 * Порядок по логину или по дате заведения. Без параметра — по логину
 * по возрастанию, как `@PageableDefault(sort = {"username", "id"})`.
 */
function sortUsers(items: readonly AdminUser[], sort: string | null): readonly AdminUser[] {
  const [field, direction] = (sort ?? 'username,asc').split(',');
  const sign = direction === 'desc' ? -1 : 1;
  const key = (user: AdminUser) => (field === 'dateJoined' ? user.dateJoined : user.username);

  return [...items].sort((a, b) => sign * key(a).localeCompare(key(b)));
}

function notFound(instance: string) {
  return problemResponse(404, {
    title: 'Not Found',
    detail: 'Пользователь не найден',
    instance,
  });
}
