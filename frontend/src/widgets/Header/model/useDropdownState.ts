import { useEffect, useRef, useState } from 'react';

/**
 * Открыто ли выпадающее меню, с закрытием по клику вне и по Escape.
 *
 * Отвечает только за это. Что именно в меню — дело сборки.
 */
export function useDropdownState() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  // Слушатели вешаются только когда есть что закрывать — постоянно висящие
  // обработчики на документе не нужны.
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return { isOpen, toggle, close, containerRef };
}
