import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const ANCHOR_OFFSET = -72;

let active: Lenis | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function startSmoothScroll(): () => void {
  if (prefersReducedMotion()) return () => {};

  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  active = lenis;

  let frame = requestAnimationFrame(function loop(time) {
    lenis.raf(time);
    frame = requestAnimationFrame(loop);
  });

  return () => {
    cancelAnimationFrame(frame);
    lenis.destroy();
    if (active === lenis) active = null;
  };
}

export function setSmoothScrollPaused(paused: boolean): void {
  if (!active) return;
  if (paused) active.stop();
  else active.start();
}

export function scrollToElement(target: HTMLElement): void {
  if (active) {
    active.scrollTo(target, { offset: ANCHOR_OFFSET, duration: 1.1 });
    return;
  }
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function scrollToId(id: string): void {
  const target = document.getElementById(id);
  if (target) scrollToElement(target);
}
