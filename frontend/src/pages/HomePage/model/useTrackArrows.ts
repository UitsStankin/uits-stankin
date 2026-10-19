import { useCallback, useEffect, useState, type RefObject } from 'react';

const EDGE_PX = 4;
const FALLBACK_STEP_SHARE = 0.8;

interface ArrowsState {
  overflows: boolean;
  canPrev: boolean;
  canNext: boolean;
}

const INITIAL: ArrowsState = { overflows: false, canPrev: false, canNext: false };

export function useTrackArrows(trackRef: RefObject<HTMLElement | null>, itemCount: number) {
  const [state, setState] = useState<ArrowsState>(INITIAL);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const next: ArrowsState = {
        overflows: max > EDGE_PX,
        canPrev: track.scrollLeft > EDGE_PX,
        canNext: track.scrollLeft < max - EDGE_PX,
      };
      setState((prev) =>
        prev.overflows === next.overflows &&
        prev.canPrev === next.canPrev &&
        prev.canNext === next.canNext
          ? prev
          : next,
      );
    };

    let frame = 0;
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          update();
        });
      }
    };

    schedule();
    track.addEventListener('scroll', schedule, { passive: true });
    const observer = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
    observer?.observe(track);

    return () => {
      track.removeEventListener('scroll', schedule);
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [trackRef, itemCount]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;

      const card = track.firstElementChild as HTMLElement | null;
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const size =
        card && card.offsetWidth > 0
          ? card.offsetWidth + gap
          : track.clientWidth * FALLBACK_STEP_SHARE;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      track.scrollBy({ left: direction * size, behavior: reduced ? 'auto' : 'smooth' });
    },
    [trackRef],
  );

  return { ...state, step };
}
