import { describe, expect, it } from 'vitest';

import { buildRings } from './arcs';

const COLORS = ['#6491F0', '#46C8A0', '#820AAA'];

describe('buildRings', () => {
  it('для одного зерна даёт один и тот же узор', () => {
    expect(buildRings(1930, COLORS)).toEqual(buildRings(1930, COLORS));
  });

  it('для разных зёрен даёт разные узоры', () => {
    expect(buildRings(1930, COLORS)).not.toEqual(buildRings(2024, COLORS));
  });

  it('красит дуги только цветами из палитры', () => {
    const fills = new Set(buildRings(1930, COLORS).flatMap((ring) => ring.segments.map((s) => s.fill)));
    for (const fill of fills) expect(COLORS).toContain(fill);
  });

  it('не ставит рядом две дуги одного цвета, если цветов больше одного', () => {
    const fills = buildRings(1930, COLORS).flatMap((ring) => ring.segments.map((s) => s.fill));
    fills.slice(1).forEach((fill, index) => expect(fill).not.toBe(fills[index]));
  });

  it('вращает соседние кольца в разные стороны', () => {
    const [first, second] = buildRings(1930, COLORS);
    expect(first.turn).toBe(-second.turn);
  });

  it('с одним цветом красит всё им', () => {
    const fills = buildRings(2024, ['#052891']).flatMap((ring) => ring.segments.map((s) => s.fill));
    expect(new Set(fills)).toEqual(new Set(['#052891']));
  });
});
