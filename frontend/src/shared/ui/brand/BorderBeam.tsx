import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@shared/lib/cn';

interface BorderBeamProps {
  children: ReactNode;
  className?: string;
  /** Сколько секунд луч делает полный круг. */
  duration?: number;
  /** Толщина луча в пикселях. */
  width?: number;
}

/**
 * Обёртка, у которой по рамке бежит цветной луч (цвета бренда).
 *
 * Радиус скругления берётся от класса, который передан снаружи: луч повторяет
 * форму рамки, а не задаёт свою. Луч вращает композитор (`rotate` слоя), а не
 * перерисовка градиента, поэтому он почти не нагружает страницу. При выключенной
 * анимации (`prefers-reduced-motion`) луч стоит на месте.
 */
export function BorderBeam({ children, className, duration = 6, width = 2 }: BorderBeamProps) {
  const style = {
    '--u-beam-duration': `${duration}s`,
    '--u-beam-width': `${width}px`,
  } as CSSProperties;

  return (
    <div className={cn('u-beam', className)} style={style}>
      <span className="u-beam-ring" aria-hidden />
      {children}
    </div>
  );
}
