import type { ReactNode } from 'react';

import { scrollToId } from '@shared/lib/smoothScroll';

interface AnchorLinkProps {
  target: string;
  className?: string;
  onActivate?: () => void;
  children: ReactNode;
}

/** Ссылка на раздел той же страницы: прокручивает плавно и не трогает адрес роутера. */
export function AnchorLink({ target, className, onActivate, children }: AnchorLinkProps) {
  return (
    <a
      href={`#${target}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        onActivate?.();
        scrollToId(target);
      }}
    >
      {children}
    </a>
  );
}
