import { http, HttpResponse } from 'msw';

import type { LoginRequest } from '@shared/types';

import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const LOGIN = '*/api/users/auth/login';
const REFRESH = '*/api/users/auth/refresh';
const LOGOUT = '*/api/users/auth/logout';

/**
 * Вход, обмен токена и выход.
 *
 * Заведены для **браузера**, а не для тестов: под `VITE_ENABLE_MOCKS`
 * портал до сих пор нельзя было пройти дальше формы входа — ручки логина
 * в наборе не было вовсе, — то есть ни личный кабинет, ни админку
 * посмотреть на выдуманных данных не получалось. Тесты входа, когда
 * они появятся, возьмут этот же набор.
 *
 * Пароль не проверяется: мок изображает удачный вход, а разбор неверного
 * пароля — отдельное состояние, и заводится оно точечно
 * (`worker.use(...)` с `problemResponse(401, ...)`). Пустой логин при этом
 * отвергается — так видно, что форма и вправду шлёт то, что ввели.
 *
 * Refresh-cookie здесь нет и быть не может: она `HttpOnly`, её ставит
 * сервер заголовком, а воркер отвечает из браузера. Для приложения это
 * незаметно — токен оно всё равно берёт из тела ответа.
 */
export function authHandlers(accessToken = 'mock-access-token') {
  return [
    http.post(LOGIN, async ({ request }) => {
      const body = (await request.json()) as LoginRequest;

      if (body.username.trim() === '') {
        return problemResponse(401, {
          title: 'Unauthorized',
          detail: 'Неверный логин или пароль.',
          instance: '/api/users/auth/login',
        });
      }

      return HttpResponse.json({ accessToken });
    }),

    http.post(REFRESH, () => HttpResponse.json({ accessToken })),

    http.post(LOGOUT, () => new HttpResponse(null, { status: 204 })),
  ];
}
