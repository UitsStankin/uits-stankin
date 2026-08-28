import axios, { type InternalAxiosRequestConfig } from 'axios';

import { LOGIN_ROUTE } from '@shared/config/routes';
import type { AccessTokenResponse } from '@shared/types';

import { toApiError } from './problem';
import { clearSession, getAccessToken, hasSession, setAccessToken } from './session';

/**
 * Ручки блока аутентификации. Экспортируются, чтобы форма входа, выход
 * и интерцепторы ниже говорили об одних и тех же адресах: строка,
 * продублированная в двух местах, рано или поздно разъедется — и логин
 * начнёт сам себя выкидывать на логин.
 */
const AUTH_PREFIX = '/api/users/auth';

export const LOGIN_PATH = `${AUTH_PREFIX}/login`;
export const LOGOUT_PATH = `${AUTH_PREFIX}/logout`;
const REFRESH_PATH = `${AUTH_PREFIX}/refresh`;

function isAuthPath(url: string | undefined): boolean {
  return url !== undefined && url.startsWith(AUTH_PREFIX);
}

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
 */
export const api = axios.create({
  baseURL,
  // Пятнадцать секунд на обычный запрос. Загрузка файла до 15 МБ на плохом
  // канале в этот лимит не укладывается — там таймаут задаётся точечно.
  timeout: 15_000,
  /**
   * Без этого браузер не приложит refresh-cookie к `refresh` и `logout`
   * и не примет её от `login` — то есть сессии просто не будет
   * (docs/API.md: «Запросы к refresh и logout обязаны идти
   * с credentials: include»). CORS на бэкенде этот режим разрешает,
   * но только для origin'ов из белого списка.
   *
   * Флаг стоит на всём клиенте, а не на трёх запросах: cookie помечена
   * `Path=/api/users/auth` и в остальные запросы всё равно не попадёт,
   * зато включённый глобально он не будет забыт в новом коде.
   */
  withCredentials: true,
});

/**
 * Реакция приложения на окончательно протухшую сессию.
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

function goToLogin(): void {
  (unauthorizedHandler ?? defaultUnauthorizedHandler)();
}

/**
 * Сессии больше нет: забыть её и увести на форму входа.
 *
 * Гасится она ровно один раз. На протухший токен налетает столько запросов,
 * сколько их было в полёте, и каждый вернулся бы сюда со своим переходом
 * на логин — в истории оказалось бы пять одинаковых записей подряд,
 * и кнопка «назад» перестала бы уводить со страницы входа.
 */
function expireSession(): void {
  if (!hasSession()) return;

  clearSession();
  goToLogin();
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  // Ручкам блока `auth` заголовок не просто не нужен — он им вреден.
  // `JwtAuthenticationFilter` на бэкенде разбирает `Authorization`
  // на КАЖДОМ запросе, включая `permitAll`, и просроченный токен роняет
  // запрос в 401 ещё до контроллера. А за обменом мы идём ровно тогда,
  // когда токен просрочен: `refresh` отвечал бы 401 при живой cookie,
  // фронт считал бы это концом сессии — и выкидывал на логин каждые
  // пятнадцать минут, то есть ровно то, что F-15 чинит.
  // Проверено на живом бэкенде 2026-08-28 просроченным токеном.
  if (token !== null && !isAuthPath(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

/** Чем закончился обмен refresh-cookie на новый access-токен. */
export type RefreshResult =
  /** Токен обновлён и уже лежит в сессии. */
  | { status: 'refreshed'; token: string }
  /** 401 от самого `refresh`: сессии больше нет, нужен пароль. */
  | { status: 'expired' }
  /** Сеть, таймаут, 500 — про сессию ничего не известно, она может быть жива. */
  | { status: 'failed' };

/**
 * Обмен идёт по одному: пока запрос в полёте, все желающие ждут его.
 *
 * Без очереди пять параллельных запросов, налетевших на просроченный токен,
 * сделали бы пять обменов. Это не просто лишний трафик: обмен РОТИРУЕТ
 * refresh-токен, и второй запрос предъявил бы уже обменянный. Бэкенд
 * прощает такое в пределах минуты (гонка вкладок), но за её пределами
 * считает кражей и гасит всю цепочку сессии — пользователя разлогинивало бы
 * тем самым кодом, который его сессию продлевает.
 */
let pendingRefresh: Promise<RefreshResult> | null = null;

export function refreshAccessToken(): Promise<RefreshResult> {
  // `finally` снимает флаг до того, как проснутся ожидающие: следующий 401
  // начнёт новый обмен, а не будет ждать уже завершённый.
  pendingRefresh ??= exchangeRefreshCookie().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
}

async function exchangeRefreshCookie(): Promise<RefreshResult> {
  try {
    // Тела у запроса нет: refresh-токен приезжает cookie, которую браузер
    // прикладывает сам.
    const { data } = await api.post<AccessTokenResponse>(REFRESH_PATH);
    setAccessToken(data.accessToken);

    return { status: 'refreshed', token: data.accessToken };
  } catch (error) {
    // 401 от самого `refresh` — единственный ответ, означающий «сессии нет».
    if (toApiError(error).status === 401) {
      clearSession();
      return { status: 'expired' };
    }

    // Обрыв связи или 500: cookie, скорее всего, жива, и хоронить сессию
    // из-за плохого канала — значит терять её на ровном месте.
    return { status: 'failed' };
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    // Отменённый запрос — не ошибка, а штатное завершение: TanStack Query
    // сама отличает отмену от провала и не показывает её пользователю.
    // Подменять её на ApiError означало бы рисовать плашку «не удалось»
    // при обычном уходе со страницы.
    if (axios.isCancel(error)) return Promise.reject(error);

    const apiError = toApiError(error);
    const config = axios.isAxiosError(error) ? error.config : undefined;

    if (apiError.status !== 401) return Promise.reject(apiError);

    // 401 от ручек блока `auth` разбирают те, кто их зовёт. На `login` это
    // неверная пара логин-пароль (и одинаковая на несуществующий логин
    // и на неверный пароль, чтобы не раскрывать список учёток), на `refresh` —
    // «сессии больше нет». Второй поход на `refresh` в ответ на 401
    // от `refresh` — это бесконечный цикл, о котором контракт предупреждает
    // отдельно.
    if (isAuthPath(config?.url)) return Promise.reject(apiError);

    // Обменивать нечего: пользователь не входил, а постучался в закрытую
    // дверь. Лишний запрос к `refresh` тут ничего не даст, гасить тоже
    // нечего — остаётся увести на форму входа.
    if (!hasSession()) {
      goToLogin();
      return Promise.reject(apiError);
    }

    // Ответ без конфига повторить нечем. В axios такого не бывает, но если
    // однажды случится, молча отдать 401 вызывающему хуже: он ждёт данные,
    // а сессия к этому моменту уже не работает.
    if (config === undefined) {
      expireSession();
      return Promise.reject(apiError);
    }

    const result = await refreshAccessToken();

    if (result.status === 'expired') expireSession();
    // `failed` — сеть или 500 на самом обмене. Сессию не хороним: отдаём
    // исходную ошибку, следующий запрос попробует обменяться заново.
    if (result.status !== 'refreshed') return Promise.reject(apiError);

    return retryWithFreshToken(config, result.token);
  },
);

/**
 * Повтор запроса с новым токеном — ровно один раз.
 *
 * Идёт мимо `api`, голым axios, и поэтому не может закольцеваться:
 * интерцептора ответа на нём нет, второй 401 просто вернётся вызывающему.
 * Флаг «этот запрос уже повторяли» в конфиге решал бы ту же задачу хуже —
 * его нужно не потерять при слиянии конфигов и не забыть проставить.
 *
 * Заголовок ставится руками по той же причине: интерцептора запроса
 * на голом axios тоже нет. Всё остальное — адрес, тело, таймаут, cookie,
 * сигнал отмены — приезжает в `config` уже собранным.
 */
async function retryWithFreshToken(config: InternalAxiosRequestConfig, token: string) {
  config.headers.set('Authorization', `Bearer ${token}`);

  try {
    return await axios.request(config);
  } catch (retryError) {
    if (axios.isCancel(retryError)) return Promise.reject(retryError);

    const retryApiError = toApiError(retryError);

    // Свежий токен — и снова 401. Это уже не «протух», а «не пустят»:
    // учётку выключили, удалили или сменили ей пароль (смена двигает
    // `tokens_not_before` и обрывает выданные раньше токены).
    if (retryApiError.status === 401) expireSession();

    return Promise.reject(retryApiError);
  }
}
