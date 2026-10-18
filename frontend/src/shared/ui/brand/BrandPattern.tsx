import { useEffect, useRef, type RefObject } from 'react';

import { buildRings } from './arcs';

interface BrandPatternProps {
  seed: number;
  colors: readonly string[];
  spin?: boolean;
  className?: string;
}

function useSpinControl(svgRef: RefObject<SVGSVGElement | null>, enabled: boolean): void {
  useEffect(() => {
    const svg = svgRef.current;
    if (!enabled || !svg || typeof svg.pauseAnimations !== 'function') return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true;

    const apply = () => {
      if (visible && !motion.matches && !document.hidden) svg.unpauseAnimations();
      else svg.pauseAnimations();
    };

    const observer =
      'IntersectionObserver' in window
        ? new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            apply();
          })
        : null;
    observer?.observe(svg);
    document.addEventListener('visibilitychange', apply);
    motion.addEventListener('change', apply);
    apply();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', apply);
      motion.removeEventListener('change', apply);
    };
  }, [svgRef, enabled]);
}

export function BrandPattern({ seed, colors, spin = false, className }: BrandPatternProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rings = buildRings(seed, colors);

  useSpinControl(svgRef, spin);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox="-520 -520 1040 1040"
      aria-hidden
      focusable="false"
    >
      {rings.map((ring, index) => (
        <g key={index}>
          {ring.segments.map((segment, i) => (
            <path key={i} d={segment.d} fill={segment.fill} />
          ))}
          {spin && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to={`${ring.turn} 0 0`}
              dur={`${ring.duration}s`}
              repeatCount="indefinite"
            />
          )}
        </g>
      ))}
    </svg>
  );
}
