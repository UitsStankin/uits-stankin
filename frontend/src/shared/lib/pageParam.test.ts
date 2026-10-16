import { describe, expect, it } from 'vitest';

import { pageHref, parsePage } from './pageParam';

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

/**
 * Сборка адреса — вторая половина того же правила: первая страница
 * канонична без параметра, иначе у списка появляется два разных адреса
 * с одинаковым содержимым.
 */
describe('pageHref', () => {
  it('первая страница — адрес раздела без параметра', () => {
    expect(pageHref('/about/employee/teachers', 1)).toBe('/about/employee/teachers');
  });

  it('остальные — с номером в запросе', () => {
    expect(pageHref('/about/employee/teachers', 2)).toBe('/about/employee/teachers?page=2');
  });

  /**
   * Ноль и отрицательные сюда приходят от самого пагинатора: стрелка «назад»
   * на первой странице считает `page - 1`. Ссылка на несуществующую нулевую
   * страницу не собирается — получается адрес первой.
   */
  it('номер меньше первого не собирает битую ссылку', () => {
    expect(pageHref('/about/news', 0)).toBe('/about/news');
    expect(pageHref('/about/news', -3)).toBe('/about/news');
  });
});

/**
 * Остальные параметры адреса — порядок сортировки в админке, дальше
 * фильтры. Они обязаны переживать перелистывание: ссылка «страница 2»,
 * сбрасывающая порядок, показывает не то, что человек листал.
 */
describe('pageHref с дополнительными параметрами', () => {
  it('несёт параметр вместе с номером страницы', () => {
    expect(pageHref('/admin/subjects', 2, { sort: 'name,desc' })).toBe(
      '/admin/subjects?page=2&sort=name,desc',
    );
  });

  it('несёт параметр и на первой странице, где номера нет', () => {
    expect(pageHref('/admin/subjects', 1, { sort: 'name,desc' })).toBe(
      '/admin/subjects?sort=name,desc',
    );
  });

  /** `null` — «параметра нет»: так умолчание не попадает в адрес. */
  it('пропускает параметр со значением null', () => {
    expect(pageHref('/admin/subjects', 1, { sort: null })).toBe('/admin/subjects');
    expect(pageHref('/admin/subjects', 3, { sort: null })).toBe('/admin/subjects?page=3');
  });

  /**
   * Запятая в значении остаётся запятой. `URLSearchParams` экранирует её
   * в `%2C`, хотя RFC 3986 разрешает её в query, — а адрес списка человек
   * видит в строке браузера и пересылает коллеге.
   */
  it('не экранирует запятую в значении сортировки', () => {
    expect(pageHref('/admin/subjects', 1, { sort: 'name,asc' })).not.toContain('%2C');
  });
});
