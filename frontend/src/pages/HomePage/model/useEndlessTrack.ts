import { useLayoutEffect, type RefObject } from 'react';

const SETTLE_MS = 160;

interface EndlessTrack {
  copies: number;
  step: (direction: 1 | -1) => void;
}

export function copiesFor(count: number): number {
  if (count < 2) return 1;
  return count < 3 ? 5 : 3;
}

export function useEndlessTrack(
  trackRef: RefObject<HTMLDivElement | null>,
  count: number,
): EndlessTrack {
  const copies = copiesFor(count);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;

    const slides = Array.from(track.querySelectorAll<HTMLElement>('[data-slide]'));
    if (slides.length < count * 2) return;

    const middleStart = ((copies - 1) / 2) * count;
    const pitch = () => slides[1].offsetLeft - slides[0].offsetLeft;
    const loopWidth = () => pitch() * count;
    const centerOn = (slide: HTMLElement) =>
      slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;

    let current = middleStart;
    let frame = 0;
    let settle = 0;
    let isTouching = false;

    const markActive = () => {
      const middle = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - middle);
        if (distance < bestDistance) {
          best = index;
          bestDistance = distance;
        }
      });
      if (best === current && slides[best].dataset.active === 'true') return;
      current = best;
      slides.forEach((slide, index) => {
        slide.dataset.active = String(index === best);
      });
    };

    const recenter = () => {
      if (isTouching) return;
      const width = loopWidth();
      const origin = centerOn(slides[middleStart]);
      if (track.scrollLeft < origin - width / 2) track.scrollLeft += width;
      else if (track.scrollLeft >= origin + width / 2) track.scrollLeft -= width;
    };

    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          markActive();
        });
      }
      window.clearTimeout(settle);
      settle = window.setTimeout(recenter, SETTLE_MS);
    };
    const onTouchStart = () => {
      isTouching = true;
    };
    const onTouchEnd = () => {
      isTouching = false;
      window.clearTimeout(settle);
      settle = window.setTimeout(recenter, SETTLE_MS);
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            track.scrollLeft = centerOn(slides[current]);
          });

    track.scrollLeft = centerOn(slides[middleStart]);
    markActive();

    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchend', onTouchEnd, { passive: true });
    track.addEventListener('touchcancel', onTouchEnd, { passive: true });
    resizeObserver?.observe(track);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      resizeObserver?.disconnect();
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchend', onTouchEnd);
      track.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [trackRef, count, copies]);

  const step = (direction: 1 | -1) => {
    const track = trackRef.current;
    const first = track?.querySelector<HTMLElement>('[data-slide]');
    const second = first?.nextElementSibling as HTMLElement | null;
    if (!track || !first || !second) return;

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    track.scrollBy({ left: direction * (second.offsetLeft - first.offsetLeft), behavior });
  };

  return { copies, step };
}
