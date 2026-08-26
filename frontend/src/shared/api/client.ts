import axios from 'axios';

import { LOGIN_ROUTE } from '@shared/config/routes';

import { toApiError } from './problem';
import { clearToken, getToken } from './tokenStorage';

/**
 * Путь логина. Экспортируется, чтобы форма входа и интерцептор ниже
 * говорили об одной и той же ручке: строка, продублированная в двух местах,
 * рано или поздно разъедется, и логин начнёт сам себя выкидывать на логин.
 */
export const LOGIN_PATH = '/api/users/auth/login';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? '';

if (import.meta.env.DEV && import.meta.env.VITE_API_BASE_URL === undefined) {
  console.warn(
    'VITE_API_BASE_URL не задан — запросы уйдут на origin фронта и упрутся в dev-сервер Vite. Проверьте frontend/.env',
  );
}

/**
 * Единственный экземпляр axios на всё приложение.
 *
 * Ответ намеренно НЕ разворачивается до `response.data`, хотя соблазн велик:
 * из ответа нужны заголовки. `POST /api/news` возвращает адрес созданной
 * новости в `Location`, и разворачивание отрезало бы его вместе со всем
 * остальным (docs/API.md, «Новости: создание, правка, удаление»).
 *
 * `Content-Type` по умолчанию тоже не задан. axios сам ставит
 * `application/json` для объектов и `multipart/form-data` с корректной
 * границей для `FormData`; прибитый гвоздями заголовок сломал бы загрузку
 * файлов на `POST /api/files`, причём молча — сервер не увидел бы границу
 * и ответил 400 на совершенно правильный запрос.
 *
 * Cookie не используются (`withCredentials` не нужен) — до T-30 контракт
 * знает только `Authorization: Bearer`.
 */
export const api = axios.create({
  baseURL,
  // Пятнадцать секунд на обычный запрос. Загрузка файла до 15 МБ на плохом
  // канале в этот лимит не укладывается — там таймаут задаётся точечно.
  timeout: 15_000,
});

/**
 * Реакция приложения на протухшую сессию.
 *
 * Интерцептор живёт вне React-дерева и обязан оставаться на слое `shared`,
 * которому по FSD запрещено знать про роутер и про кэш запросов. Поэтому
 * реакцию регистрирует слой `app` — см. `app/providers/setupApi.ts`.
 */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

/**
 * Запасной вариант на случай, если 401 прилетел раньше, чем `app` успел
 * зарегистрировать обработчик. Перезагружает страницу целиком — грубо,
 * зато не оставляет пользователя на закрытой странице с пустыми данными.
 */
function defaultUnauthorizedHandler(): void {
  window.location.assign(LOGIN_ROUTE);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Отменённый запрос — не ошибка, а штатное завершение: TanStack Query
    // сама отличает отмену от провала и не показывает её пользователю.
    // Подменять её на ApiError означало бы рисовать плашку «не удалось»
    // при обычном уходе со страницы.
    if (axios.isCancel(error)) return Promise.reject(error);

    const apiError = toApiError(error);
    const requestPath = axios.isAxiosError(error) ? error.config?.url : undefined;

    // 401 означает «токена нет, он протух или невалиден» — стереть и на логин.
    //
    // Кроме самой формы входа: там 401 отвечает на неверную пару логин-пароль
    // (причём одинаково на несуществующий логин и на неверный пароль, чтобы
    // не раскрывать список существующих). Стирать там нечего, а редирект
    // на логин с логина стёр бы введённые данные и сообщение об ошибке.
    if (apiError.status === 401 && requestPath !== LOGIN_PATH) {
      clearToken();
      (unauthorizedHandler ?? defaultUnauthorizedHandler)();
    }

    return Promise.reject(apiError);
  },
);
