import { describe, expect, it } from 'vitest';

import { accountName } from './accountName';

describe('accountName', () => {
  it('собирает «Фамилия Имя»', () => {
    expect(accountName({ id: 5, lastName: 'Абрамова', firstName: 'Анна' })).toBe('Абрамова Анна');
  });

  it('обходится одной фамилией', () => {
    expect(accountName({ id: 5, lastName: 'Абрамова', firstName: null })).toBe('Абрамова');
  });

  it('без ФИО называет номер учётки, а не пустую строку', () => {
    expect(accountName({ id: 5, lastName: null, firstName: null })).toBe('Учётная запись № 5');
  });
});
