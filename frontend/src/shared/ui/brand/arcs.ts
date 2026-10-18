export interface ArcSegment {
  d: string;
  fill: string;
}

export interface ArcRing {
  segments: ArcSegment[];
  turn: number;
  duration: number;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function point(radius: number, angle: number): string {
  return `${(radius * Math.cos(angle)).toFixed(1)} ${(radius * Math.sin(angle)).toFixed(1)}`;
}

function arcPath(inner: number, outer: number, from: number, to: number): string {
  const large = to - from > Math.PI ? 1 : 0;
  return `M${point(outer, from)}A${outer} ${outer} 0 ${large} 1 ${point(outer, to)}L${point(inner, to)}A${inner} ${inner} 0 ${large} 0 ${point(inner, from)}Z`;
}

const MAX_RADIUS = 500;

export function buildRings(seed: number, colors: readonly string[]): ArcRing[] {
  const rand = seeded(seed);
  const rings: ArcRing[] = [];
  let radius = 34;
  let index = 0;
  let lastColor = -1;

  while (radius < MAX_RADIUS) {
    const thickness = Math.max(6, 58 - index * 6.5);
    const count = 1 + Math.floor(rand() * 3);
    let angle = rand() * Math.PI * 2;
    const segments: ArcSegment[] = [];

    for (let i = 0; i < count; i += 1) {
      const sweep = (0.35 + rand() * 1.1) * (index < 2 ? 1.6 : 1);
      let color = Math.floor(rand() * colors.length);
      if (colors.length > 1 && color === lastColor) color = (color + 1) % colors.length;
      lastColor = color;
      segments.push({ d: arcPath(radius, radius + thickness, angle, angle + sweep), fill: colors[color] });
      angle += sweep + 0.25 + rand() * 0.9;
    }

    rings.push({
      segments,
      turn: index % 2 === 0 ? 360 : -360,
      duration: 90 + index * 22,
    });
    radius += thickness + 6 + rand() * 18;
    index += 1;
  }

  return rings;
}
