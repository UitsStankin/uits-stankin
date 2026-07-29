import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Какая цепочка разделов меню раскрыта.
 *
 * Состояние хранится одним массивом ключей от верхнего уровня вглубь:
 * `['about', 'about/employee']` — открыт раздел «О кафедре», а в нём вылет
 * «Сотрудники кафедры».
 *
 * Раньше каждый NavDropdown держал в себе, кто из его детей раскрыт, и
 * состояние было размазано по дереву. Одним массивом проще: закрыть всё —
 * это одна операция, а не обход, и компоненты становятся чистыми.
 *
 * Отвечает только за то, ЧТО открыто. Когда открывать — дело useHoverIntent.
 */
export function useNavMenu() {
  const [openPath, setOpenPath] = useState<readonly string[]>([]);
  const containerRef = useRef<HTMLElement | null>(null);

  /** Открыт ли `key` на глубине `depth`. */
  const isOpen = useCallback(
    (key: string, depth: number) => openPath[depth] === key,
    [openPath]
  );

  /**
   * Открыть `key` на глубине `depth`, отбросив всё, что было глубже.
   * `null` — закрыть этот уровень и всё под ним.
   */
  const setOpenAt = useCallback((depth: number, key: string | null) => {
    setOpenPath((prev) =>
      key === null ? prev.slice(0, depth) : [...prev.slice(0, depth), key]
    );
  }, []);

  const closeAll = useCallback(() => setOpenPath([]), []);

  // Клик мимо меню закрывает его. Слушатель вешается только когда есть что
  // закрывать — постоянно висящий обработчик на документе не нужен.
  useEffect(() => {
    if (openPath.length === 0) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeAll();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openPath.length, closeAll]);

  return { openPath, isOpen, setOpenAt, closeAll, containerRef };
}
