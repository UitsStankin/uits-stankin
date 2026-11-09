import { http, HttpResponse } from 'msw';

import type { Profile, ProfileUpdateRequest } from '@shared/types';

/** `*` вместо origin — по той же причине, что и у новостей. */
const PROFILE = '*/api/users/profile';

/**
 * Профиль со всеми полями контракта. Переопределяется точечно: тесту
 * обычно нужны роль или аватар, а не десять полей DTO.
 */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 1,
    username: 'petrov',
    firstName: 'Пётр',
    lastName: 'Петров',
    email: 'petrov@stankin.ru',
    avatar: null,
    avatarUrl: null,
    teacher: false,
    moderator: false,
    superuser: false,
    ...overrides,
  };
}

/**
 * Чтение и правка профиля.
 *
 * `PUT` отвечает **не телом запроса**, а профилем, собранным из него по
 * правилам контракта: незаполненное поле приходит обратно как `null`, ключ
 * аватара превращается в пару «ключ и адрес», а логин, почта и флаги ролей
 * берутся из прежнего профиля — их эта ручка молча игнорирует. Мок, который
 * просто вернул бы присланное, зеленил бы форму, отправляющую почту, —
 * то есть скрывал бы ровно ту ошибку, ради которой почта не сделана полем.
 *
 * Дальше, чем нужно тестам, мок не заходит: ни длину имени, ни существование
 * ключа в разделе `avatars` он не проверяет. Оба отказа заводятся точечно
 * там, где проверяются, — `server.use(...)` с `problemResponse`.
 */
export function profileHandlers(profile: Profile = makeProfile()) {
  let current = profile;

  return [
    http.get(PROFILE, () => HttpResponse.json(current)),

    http.put(PROFILE, async ({ request }) => {
      const body = (await request.json()) as ProfileUpdateRequest;

      current = {
        ...current,
        firstName: body.firstName,
        lastName: body.lastName,
        avatar: body.avatar,
        // Адрес собирает бэкенд, и по ключу его на фронте не построить —
        // здесь это делает мок, ровно как хранилище: префикс `/media`.
        avatarUrl: body.avatar === null ? null : `/media/${body.avatar}`,
      };

      return HttpResponse.json(current);
    }),
  ];
}
