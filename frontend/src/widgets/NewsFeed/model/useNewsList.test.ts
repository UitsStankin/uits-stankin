import { describe, expect, it } from 'vitest';

import { parsePage } from './useNewsList';

/**
 * Номер страницы из адреса. Сюда приезжает не только то, что фронт написал
 * сам: адрес правят руками, присылают ссылками и режут при копировании.
 */
describe('parsePage', () => {
  it('берёт номер страницы, когда он есть', () => {
    expect(parsePage('2')).toBe(2);
    expect(parsePage('10')).toBe(10);
  });

  it('без параметра — первая страница', () => {
    expect(parsePage(null)).toBe(1);
    expect(parsePage('')).toBe(1);
  });

  it('мусор в адресе — первая страница, а не ошибка', () => {
    expect(parsePage('abc')).toBe(1);
    expect(parsePage('2.5')).toBe(1);
    expect(parsePage('Infinity')).toBe(1);
    expect(parsePage('NaN')).toBe(1);
  });

  /** Счёт с единицы: `?page=0` в адресе выглядит поломкой, а не первой страницей. */
  it('ноль и отрицательные — первая страница', () => {
    expect(parsePage('0')).toBe(1);
    expect(parsePage('-1')).toBe(1);
    expect(parsePage('-100')).toBe(1);
  });

  /**
   * Число за пределами данных разбирается как число — и это правильно:
   * решать, что страницы 9000 не существует, здесь нечем, `totalPages`
   * известен только после ответа. Показывать «такой страницы нет» —
   * дело модели, а не разбора адреса.
   */
  it('большой номер пропускает дальше — про границы знает только ответ', () => {
    expect(parsePage('9000')).toBe(9000);
  });
});
