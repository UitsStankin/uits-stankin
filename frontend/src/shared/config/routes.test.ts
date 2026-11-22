import { describe, expect, it } from 'vitest';

import { readReturnTo } from './routes';

/**
 * Адрес возврата с формы раздела (F-52). Состояние перехода типизировано
 * как `unknown`, и разбор обязан пропускать только свой путь.
 */
describe('readReturnTo', () => {
  it('отдаёт свой путь вместе с параметрами', () => {
    expect(readReturnTo({ returnTo: '/teachers?page=2' })).toBe('/teachers?page=2');
  });

  it('без состояния или без поля отдаёт null', () => {
    expect(readReturnTo(null)).toBeNull();
    expect(readReturnTo(undefined)).toBeNull();
    expect(readReturnTo('/contacts')).toBeNull();
    expect(readReturnTo({ from: '/contacts' })).toBeNull();
    expect(readReturnTo({ returnTo: 42 })).toBeNull();
  });

  /** `//host` — путь только на вид: браузер уйдёт на чужой сайт. */
  it('не пропускает адрес другого сайта', () => {
    expect(readReturnTo({ returnTo: '//evil.example/login' })).toBeNull();
    expect(readReturnTo({ returnTo: 'https://evil.example' })).toBeNull();
  });
});
