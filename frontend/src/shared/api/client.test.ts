import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { problemResponse } from './mocks';
import { server } from './mocks/server';
import { api, refreshAccessToken, setUnauthorizedHandler } from './client';
import { clearSession, hasSession, setAccessToken } from './session';

const PROFILE = '*/api/users/profile';
const REFRESH = '*/api/users/auth/refresh';

/**
 * Значения токенов — латиницей. Заголовок HTTP не переносит кириллицу:
 * до мока «свежий» доезжает мятым, и хендлер, сравнивающий заголовок,
 * не узнаёт собственный токен. Час на разбор, если написать по-русски.
 */
const STALE_TOKEN = 'stale-access-token';
const FRESH_TOKEN = 'fresh-access-token';

/** Ответ `401` — тот же RFC 9457, что отдаёт бэкенд. */
function unauthorized(instance: string) {
  return problemResponse(401, {
    title: 'Unauthorized',
    detail: 'Токен недействителен',
    instance,
  });
}

/**
 * Что делает клиент, когда сессия кончилась насовсем.
 *
 * Проверяется не «пришёл 401», а решение, которое на него принимается:
 * обычный 401 лечится обменом refresh-cookie и повтором запроса, а 401
 * от самого обмена лечить нечем — это конец сессии, и о нём надо сообщить
 * приложению ровно один раз.
 *
 * До этих тестов у `shared/api` не было ни одной проверки, и цена оказалась
 * не теоретической: охрана «гасим ровно один раз» съедала не лишние вызовы,
 * а единственный.
 */
describe('перехватчик 401', () => {
  beforeEach(() => {
    clearSession();
  });

  it('обменивает протухший токен и повторяет запрос', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken(STALE_TOKEN);

    let exchanged = false;

    server.use(
      http.post(REFRESH, () => {
        exchanged = true;
        return HttpResponse.json({ accessToken: FRESH_TOKEN });
      }),
      http.get(PROFILE, ({ request }) =>
        // Первый заход — со старым токеном и в 401; после обмена
        // тот же адрес отвечает данными.
        request.headers.get('Authorization') === `Bearer ${FRESH_TOKEN}`
          ? HttpResponse.json({ username: 'demo' })
          : unauthorized('/api/users/profile'),
      ),
    );

    const { data } = await api.get<{ username: string }>('/api/users/profile');

    expect(data.username).toBe('demo');
    expect(exchanged).toBe(true);
    // Сессия жива — уводить на форму входа не за что.
    expect(hasSession()).toBe(true);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  /**
   * Главный случай: `refresh` тоже отвечает `401`. Лечить нечем, и
   * приложение обязано об этом узнать — иначе кэш прошлой сессии переживёт
   * разлогин, а на публичной странице не произойдёт вообще ничего.
   */
  it('на 401 от самого обмена гасит сессию и сообщает приложению', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken(STALE_TOKEN);

    server.use(
      http.get(PROFILE, () => unauthorized('/api/users/profile')),
      http.post(REFRESH, () => unauthorized('/api/users/auth/refresh')),
    );

    await expect(api.get('/api/users/profile')).rejects.toThrow();

    expect(hasSession()).toBe(false);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  /**
   * И ровно один раз на всех. На протухший токен налетает столько запросов,
   * сколько их было в полёте; каждый со своим переходом на логин оставил бы
   * в истории пять одинаковых записей подряд, и «назад» перестала бы уводить
   * с формы входа.
   */
  it('пять запросов разом гасят сессию один раз и обменивают один раз', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken(STALE_TOKEN);

    let exchanges = 0;

    server.use(
      http.get(PROFILE, () => unauthorized('/api/users/profile')),
      http.post(REFRESH, () => {
        exchanges += 1;
        return unauthorized('/api/users/auth/refresh');
      }),
    );

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => api.get('/api/users/profile')),
    );

    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    // Обмен ротирует refresh-токен: пять обменов подряд бэкенд считает
    // кражей и гасит всю цепочку сессии.
    expect(exchanges).toBe(1);
  });

  /**
   * Обрыв связи на обмене — не конец сессии: cookie, скорее всего, жива,
   * и хоронить её из-за плохого канала значит терять вход на ровном месте.
   */
  it('на 500 от обмена сессию не хоронит', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken(STALE_TOKEN);

    server.use(
      http.get(PROFILE, () => unauthorized('/api/users/profile')),
      http.post(REFRESH, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/users/auth/refresh',
        }),
      ),
    );

    await expect(api.get('/api/users/profile')).rejects.toThrow();

    expect(hasSession()).toBe(true);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  /**
   * Гость постучался в закрытую дверь: обменивать нечего и гасить нечего,
   * но увести на форму входа надо — иначе запрос молча провалится.
   */
  it('без сессии на логин уводит, но обмен не пробует', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    let exchanges = 0;

    server.use(
      http.get(PROFILE, () => unauthorized('/api/users/profile')),
      http.post(REFRESH, () => {
        exchanges += 1;
        return unauthorized('/api/users/auth/refresh');
      }),
    );

    await expect(api.get('/api/users/profile')).rejects.toThrow();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(exchanges).toBe(0);
  });

  /**
   * Обмен сам сессию не трогает — он только сообщает, чем кончилось.
   * Это и есть то, на чём держится «ровно один раз» выше: признак сессии
   * к моменту разбора ещё жив, и снимает его первый пришедший.
   */
  it('обмен сообщает об истёкшей сессии, но не гасит её сам', async () => {
    setAccessToken(STALE_TOKEN);

    server.use(http.post(REFRESH, () => unauthorized('/api/users/auth/refresh')));

    const result = await refreshAccessToken();

    expect(result.status).toBe('expired');
    expect(hasSession()).toBe(true);
  });
});
