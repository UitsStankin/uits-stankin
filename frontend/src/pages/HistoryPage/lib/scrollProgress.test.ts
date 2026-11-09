import { describe, expect, it } from 'vitest';

import { scrollProgressPercent } from './scrollProgress';

/**
 * Доля прочитанного. Ошибки здесь тихие: полоса не падает, а застревает
 * или уезжает за край, и заметить это можно только на нужной длине
 * страницы — той, которой в тесте страницы не бывает.
 */
describe('scrollProgressPercent', () => {
  it('считает долю пролистанного от прокручиваемой высоты', () => {
    // Страница 3000, окно 1000 — прокрутить можно 2000.
    expect(scrollProgressPercent(0, 3000, 1000)).toBe(0);
    expect(scrollProgressPercent(500, 3000, 1000)).toBe(25);
    expect(scrollProgressPercent(1000, 3000, 1000)).toBe(50);
    expect(scrollProgressPercent(2000, 3000, 1000)).toBe(100);
  });

  /**
   * Та самая дырка оригинала: он делил на `pageHeight - windowHeight`
   * без проверки. Страница короче окна давала `0/0` — `NaN`, — и полоса
   * оставалась там, где её застало предыдущее значение.
   */
  it('на странице короче окна отдаёт ноль, а не NaN', () => {
    expect(scrollProgressPercent(0, 800, 800)).toBe(0);
    expect(scrollProgressPercent(0, 500, 800)).toBe(0);
  });

  /**
   * Резиновая прокрутка в Safari и на телефонах уводит `scrollY`
   * за оба края: вверху он отрицательный, внизу больше прокручиваемой
   * высоты. Без обрезки полоса на оттяжке уезжала бы за экран.
   */
  it('обрезает выход за края при резиновой прокрутке', () => {
    expect(scrollProgressPercent(-120, 3000, 1000)).toBe(0);
    expect(scrollProgressPercent(2300, 3000, 1000)).toBe(100);
  });

  /** Целые проценты — на них держится экономия перерисовок в хуке. */
  it('округляет до целых процентов', () => {
    expect(scrollProgressPercent(7, 3000, 1000)).toBe(0);
    expect(scrollProgressPercent(333, 3000, 1000)).toBe(17);
  });
});
