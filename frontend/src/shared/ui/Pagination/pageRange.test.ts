import { describe, expect, it } from 'vitest';

import { pageRange } from './pageRange';

/**
 * Полоса пагинатора. Ошибки здесь именно те, что не видно глазами:
 * пропавшая с краю страница, съехавшее на один номер окно, прыгающая
 * при перелистывании ширина.
 */
describe('pageRange', () => {
  it('показывает все номера, пока они помещаются', () => {
    expect(pageRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('в начале списка прячет только правый хвост', () => {
    expect(pageRange(1, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10]);
    expect(pageRange(3, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10]);
  });

  it('в середине прячет оба края', () => {
    expect(pageRange(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });

  /**
   * Тот самый случай из комментария к функции: на последних страницах окно
   * упирается в конец, и наивная реализация показывает «1 … 9 10» вместо
   * полной полосы.
   */
  it('в конце списка показывает столько же номеров, сколько в начале', () => {
    expect(pageRange(10, 10)).toEqual([1, 'gap', 6, 7, 8, 9, 10]);
    expect(pageRange(9, 10)).toEqual([1, 'gap', 6, 7, 8, 9, 10]);
  });

  /**
   * Четвёртая страница от края — единственное место, где многоточие может
   * встать вместо одного номера. Тест написан раньше правки и поймал именно
   * это: функция отдавала «1 … 3 4 5 … 10», хотя комментарий рядом с ней
   * такое прямо запрещает.
   */
  it('не ставит многоточие вместо одной страницы', () => {
    expect(pageRange(4, 10)).toEqual([1, 2, 3, 4, 5, 'gap', 10]);
    expect(pageRange(7, 10)).toEqual([1, 'gap', 6, 7, 8, 9, 10]);
  });

  it('каждым многоточием прячет не меньше двух страниц', () => {
    for (let siblings = 1; siblings <= 3; siblings += 1) {
      for (let total = 0; total <= 60; total += 1) {
        for (let page = 1; page <= Math.max(total, 1); page += 1) {
          const slots = pageRange(page, total, siblings);

          slots.forEach((slot, index) => {
            if (slot !== 'gap') return;

            // Соседи многоточия всегда номера: два подряд оно не ставит,
            // а по краям полосы стоят первая и последняя страницы.
            const before = slots[index - 1] as number;
            const after = slots[index + 1] as number;

            expect(after - before - 1).toBeGreaterThanOrEqual(2);
          });
        }
      }
    }
  });

  it('держит постоянную ширину на всём списке', () => {
    const widths = new Set<number>();
    for (let page = 1; page <= 40; page += 1) widths.add(pageRange(page, 40).length);

    expect([...widths]).toEqual([7]);
  });

  it('всегда содержит первую, последнюю и текущую страницу', () => {
    for (let page = 1; page <= 40; page += 1) {
      const slots = pageRange(page, 40);

      expect(slots).toContain(1);
      expect(slots).toContain(40);
      expect(slots).toContain(page);
    }
  });

  it('идёт по возрастанию и не ставит два многоточия подряд', () => {
    for (let page = 1; page <= 40; page += 1) {
      const slots = pageRange(page, 40);
      const numbers = slots.filter((slot): slot is number => slot !== 'gap');

      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
      expect(slots.some((slot, index) => slot === 'gap' && slots[index + 1] === 'gap')).toBe(false);
    }
  });

  it('слушается параметра siblings', () => {
    expect(pageRange(10, 20, 2)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 20]);
  });

  /** Пустой список — не ошибка: у ленты без новостей ноль страниц. */
  it('не падает на нулевом и единичном списке', () => {
    expect(pageRange(1, 0)).toEqual([]);
    expect(pageRange(1, 1)).toEqual([1]);
  });
});
