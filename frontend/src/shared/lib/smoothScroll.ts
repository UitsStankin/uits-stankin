function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function scrollToElement(target: HTMLElement): void {
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

export function scrollToId(id: string): void {
  const target = document.getElementById(id);
  if (target) scrollToElement(target);
}
