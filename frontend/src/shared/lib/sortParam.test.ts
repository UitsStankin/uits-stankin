import { describe, expect, it } from 'vitest';

import { parseSort, sortParam } from './sortParam';

const SORTABLE = ['name'] as const;
const DEFAULT = [{ id: 'name', desc: false }];

/**
 * Порядок из адреса. Сюда приезжает не только то, что фронт написал сам:
 * адрес правят руками и присылают ссылками.
 */
describe('parseSort', () => {
  it('берёт поле и направление, когда они есть', () => {
    expect(parseSort('name,desc', SORTABLE, DEFAULT)).toEqual([{ id: 'name', desc: true }]);
    expect(parseSort('name,asc', SORTABLE, DEFAULT)).toEqual([{ id: 'name', desc: false }]);
  });

  it('без параметра — порядок раздела по умолчанию', () => {
    expect(parseSort(null, SORTABLE, DEFAULT)).toEqual(DEFAULT);
  });

  /**
   * Главное здесь: неизвестное поле НЕ уезжает в запрос. Spring отвечает
   * на него `400` с именем поля, то есть чужая ссылка ломала бы страницу
   * вместо того, чтобы показать её в обычном порядке.
   */
  it('незнакомое поле — порядок по умолчанию, а не запрос с ним', () => {
    expect(parseSort('password,asc', SORTABLE, DEFAULT)).toEqual(DEFAULT);
    expect(parseSort('description,desc', SORTABLE, DEFAULT)).toEqual(DEFAULT);
  });

  it('мусор вместо направления — порядок по умолчанию', () => {
    expect(parseSort('name', SORTABLE, DEFAULT)).toEqual(DEFAULT);
    expect(parseSort('name,вверх', SORTABLE, DEFAULT)).toEqual(DEFAULT);
    expect(parseSort('', SORTABLE, DEFAULT)).toEqual(DEFAULT);
  });
});

/** Сборка — вторая половина того же правила: одна строка «поле,направление». */
describe('sortParam', () => {
  it('собирает значение в форме контракта', () => {
    expect(sortParam([{ id: 'name', desc: true }])).toBe('name,desc');
    expect(sortParam([{ id: 'name', desc: false }])).toBe('name,asc');
  });

  it('пустой порядок — параметра нет', () => {
    expect(sortParam([])).toBeNull();
  });

  /**
   * Разбор и сборка обязаны быть обратны друг другу: на этом стоит и адрес
   * списка, и параметр запроса — они одно и то же значение.
   */
  it('разбирает то, что собрал', () => {
    const value = sortParam([{ id: 'name', desc: true }]);

    expect(sortParam(parseSort(value, SORTABLE, DEFAULT))).toBe(value);
  });
});
