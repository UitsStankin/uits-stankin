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
