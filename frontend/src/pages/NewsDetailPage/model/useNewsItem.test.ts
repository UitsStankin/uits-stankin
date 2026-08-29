import { describe, expect, it } from 'vitest';

import { parseId } from './useNewsItem';

/**
 * Идентификатор из адреса. Всё, что не положительное целое, обязано стать
 * `null`: `@PathVariable Long` на бэкенде отвечает на «abc» четырёхсотой,
 * и пользователь увидел бы «ошибка сервера» там, где на самом деле опечатка
 * в ссылке.
 */
describe('parseId', () => {
  it('берёт идентификатор, когда он есть', () => {
    expect(parseId('1')).toBe(1);
    expect(parseId('4242')).toBe(4242);
  });

  it('пустой адрес — null', () => {
    expect(parseId(undefined)).toBeNull();
    expect(parseId('')).toBeNull();
  });

  it('нечисловой идентификатор — null, а не запрос', () => {
    expect(parseId('abc')).toBeNull();
    expect(parseId('1abc')).toBeNull();
    expect(parseId('1.5')).toBeNull();
  });

  /** Ноль отличается от `parsePage`: страницы считаются с единицы, и `id` тоже. */
  it('ноль и отрицательные — null', () => {
    expect(parseId('0')).toBeNull();
    expect(parseId('-1')).toBeNull();
  });
});
