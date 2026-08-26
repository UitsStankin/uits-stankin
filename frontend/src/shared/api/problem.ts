import axios from 'axios';

/**
 * Тело ошибки в формате RFC 9457 Problem Details — ровно так, как его
 * присылает Spring. Подробности и семантика статусов — docs/API.md,
 * раздел «Формат ошибок».
 */
export type ProblemDetail = {
  /**
   * По RFC 9457 значение по умолчанию — `about:blank`, и Spring такое
   * не сериализует, поэтому в сегодняшних ответах поля нет вовсе.
   * Объявлено на будущее: оно появится, если на бэкенде заведут
   * собственные типы ошибок.
   */
  type?: string;
  title: string;
  status: number;
  detail: string;
  /** Путь запроса, на котором случилась ошибка. */
  instance: string;
  timestamp: string;
  /**
   * Только у ошибки валидации формы: имя поля → список сообщений,
   * пригодных для показа пользователю. На одно поле сообщений может быть
   * несколько, порядок в списке не гарантирован.
   */
  errors?: Record<string, string[]>;
};

/**
 * Нормализованная ошибка запроса — единственный тип, который видит
 * прикладной код.
 *
 * Смысл в том, чтобы ни одна форма и ни одна страница не разбирали
 * `error.response.data` руками: до сюда доезжают и ответы бэкенда,
 * и обрыв сети, и таймаут, и HTML-заглушка от прокси — а наружу выходит
 * одна форма с осмысленным `status`.
 */
export class ApiError extends Error {
  /** HTTP-статус. `0` — ответа не было вовсе: сеть, таймаут, отказ CORS. */
  readonly status: number;
  readonly title: string;
  /**
   * Текст ошибки от сервера, как есть. Для показа пользователю брать
   * `message`, а не это поле: у 5xx `detail` — внутренняя диагностика.
   */
  readonly detail: string;
  readonly instance: string | null;
  /**
   * Момент ошибки по часам сервера. Нужен не интерфейсу, а issue: по нему
   * бэкендер находит строчку в логах, не переспрашивая «когда это было».
   */
  readonly timestamp: string | null;
  /** Словарь ошибок валидации формы; `null` у всех остальных ошибок. */
  readonly errors: Record<string, string[]> | null;

  constructor(init: {
    status: number;
    title: string;
    detail: string;
    instance?: string | null;
    timestamp?: string | null;
    errors?: Record<string, string[]> | null;
    cause?: unknown;
  }) {
    super(userMessage(init.status, init.detail), { cause: init.cause });
    this.name = 'ApiError';
    this.status = init.status;
    this.title = init.title;
    this.detail = init.detail;
    this.instance = init.instance ?? null;
    this.timestamp = init.timestamp ?? null;
    this.errors = init.errors ?? null;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Приводит что угодно, прилетевшее из axios, к `ApiError`.
 *
 * Тело ответа проверяется, а не приводится типом: `application/problem+json`
 * гарантирован контрактом только для ошибок самого Spring. Прокси, nginx
 * и dev-сервер Vite отвечают HTML или пустотой, и слепой каст превратил бы
 * такую ошибку в объект с `undefined` во всех полях.
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (axios.isAxiosError(error)) {
    const { response } = error;

    // Ответа нет: сеть, таймаут, отказ CORS, выключенный бэкенд.
    if (!response) {
      return new ApiError({
        status: 0,
        title: error.code ?? 'Network Error',
        detail: error.message,
        cause: error,
      });
    }

    const body: unknown = response.data;

    if (isProblemDetail(body)) {
      return new ApiError({
        // Статус берётся из HTTP-ответа, а не из тела: решения вроде
        // «выкинуть на логин» принимаются по нему, и разойтись эти два
        // числа могут только если тело подменили по дороге.
        status: response.status,
        title: body.title,
        detail: body.detail ?? '',
        instance: body.instance ?? null,
        timestamp: body.timestamp ?? null,
        errors: parseFieldErrors(body.errors),
        cause: error,
      });
    }

    return new ApiError({
      status: response.status,
      title: response.statusText || 'HTTP Error',
      detail: '',
      cause: error,
    });
  }

  return new ApiError({
    status: 0,
    title: 'Unknown Error',
    detail: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

function isProblemDetail(data: unknown): data is ProblemDetail {
  if (typeof data !== 'object' || data === null) return false;
  const candidate = data as Partial<ProblemDetail>;
  return typeof candidate.status === 'number' && typeof candidate.title === 'string';
}

/**
 * Оставляет из словаря валидации только записи ожидаемой формы
 * «поле → массив строк». Форма будет раскладывать это по своим полям,
 * и мусор вроде `null` вместо массива уронил бы её на `.map`.
 */
function parseFieldErrors(raw: unknown): Record<string, string[]> | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(raw)) {
    if (Array.isArray(messages)) {
      const strings = messages.filter((message) => typeof message === 'string');
      if (strings.length > 0) result[field] = strings;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Текст для пользователя.
 *
 * `detail` бэкенда написан по-русски и годится для показа — но ровно в двух
 * случаях брать его нельзя.
 *
 * При 5xx это диагностика сбоя: посетителю портала из неё ничего не следует,
 * а утечь наружу может лишнее — стек, имя класса, кусок запроса.
 *
 * При нулевом статусе `detail` пришёл вообще не от бэкенда, а от axios,
 * и написан по-английски: «Network Error», «timeout of 15000ms exceeded».
 * Показывать это пользователю нельзя, а выбрасывать жалко — в `detail`
 * оно и остаётся, для консоли и для issue.
 *
 * Реакции на статусы — docs/API.md, колонка «Реакция фронта».
 */
function userMessage(status: number, detail: string): string {
  if (status === 0 || status >= 500) return fallbackMessage(status);
  return detail || fallbackMessage(status);
}

function fallbackMessage(status: number): string {
  switch (status) {
    case 0:
      return 'Не удалось связаться с сервером. Проверьте соединение.';
    case 400:
      return 'Проверьте правильность заполнения формы.';
    case 401:
      return 'Требуется вход в систему.';
    case 403:
      return 'Недостаточно прав для этого действия.';
    case 404:
      return 'Не найдено.';
    case 409:
      return 'Данные успели измениться, повторите попытку.';
    case 413:
      return 'Файл слишком большой.';
    default:
      return status >= 500 ? 'Ошибка на сервере, попробуйте позже.' : 'Не удалось выполнить запрос.';
  }
}
