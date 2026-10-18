import { useEffect, useRef, type RefObject } from 'react';

import { buildRings } from './arcs';

interface BrandPatternProps {
  seed: number;
  colors: readonly string[];
  spin?: boolean;
  className?: string;
}

const VIEW_BOX = '-520 -520 1040 1040';

/**
 * Вращение узора ставится на паузу, пока он вне экрана или вкладка скрыта.
 * Сам поворот — CSS-анимация `transform` одного слоя: её ведёт композитор,
 * главный поток не перерисовывает узор на каждом кадре.
 */
function usePauseOffscreen(ref: RefObject<HTMLDivElement | null>, enabled: boolean): void {
  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;

    let visible = true;
    const apply = () => {
      node.dataset.paused = String(!visible || document.hidden);
    };

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            apply();
          })
        : null;
    observer?.observe(node);
    document.addEventListener('visibilitychange', apply);
    apply();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', apply);
    };
  }, [ref, enabled]);
}

export function BrandPattern({ seed, colors, spin = false, className }: BrandPatternProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const rings = buildRings(seed, colors);

  usePauseOffscreen(wrapRef, spin);

  const paths = rings.map((ring, index) => (
    <g key={index}>
      {ring.segments.map((segment, i) => (
        <path key={i} d={segment.d} fill={segment.fill} />
      ))}
    </g>
  ));

  if (!spin) {
    return (
      <svg className={className} viewBox={VIEW_BOX} aria-hidden focusable="false">
        {paths}
      </svg>
    );
  }

  return (
    <div ref={wrapRef} className={className} aria-hidden>
      <svg className="u-pattern-spin" viewBox={VIEW_BOX} focusable="false">
        {paths}
      </svg>
    </div>
  );
}
