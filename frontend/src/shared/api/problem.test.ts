import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { toApiError } from './problem';

function responseError(status: number, data: unknown, headers = new AxiosHeaders()) {
  const response: AxiosResponse = {
    status,
    data,
    headers,
    statusText: '',
    config: { headers: new AxiosHeaders() },
  };
  return new AxiosError('Request failed', undefined, response.config, undefined, response);
}

describe('разбор ошибок API', () => {
  it('берёт статус из HTTP и сохраняет только строковые ошибки полей', () => {
    const error = toApiError(responseError(400, {
      title: 'Validation',
      status: 200,
      detail: 'Проверьте поля',
      instance: '/api/news',
      timestamp: '2026-11-20T10:00:00Z',
      errors: { title: ['Нужно название', null], display: false, author: [5] },
    }));

    expect(error).toMatchObject({
      status: 400,
      message: 'Проверьте поля',
      instance: '/api/news',
      timestamp: '2026-11-20T10:00:00Z',
      errors: { title: ['Нужно название'] },
    });
  });

  it('скрывает диагностику бэкенда и HTML прокси за общим сообщением', () => {
    expect(toApiError(responseError(500, { title: 'Server Error', status: 500, detail: 'Путь к файлу' })))
      .toMatchObject({ status: 500, message: 'Ошибка на сервере, попробуйте позже.', detail: 'Путь к файлу' });
    expect(toApiError(responseError(502, '<html>Bad gateway</html>')))
      .toMatchObject({ status: 502, message: 'Ошибка на сервере, попробуйте позже.', errors: null });
  });

  it('читает время ожидания и при пустом теле ответа прокси', () => {
    const error = toApiError(responseError(429, null, new AxiosHeaders({ 'retry-after': '30' })));
    expect(error).toMatchObject({ status: 429, retryAfter: 30 });
  });

  it('даёт русское сообщение об ошибке без HTTP-ответа', () => {
    expect(toApiError(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatchObject({
      status: 0,
      message: 'Не удалось связаться с сервером. Проверьте соединение.',
    });
  });
});
