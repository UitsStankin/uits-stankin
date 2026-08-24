import { useEffect, useRef } from 'react';

/** Задержка из оригинала: 150 мс и на открытие, и на закрытие. */
const DEFAULT_DELAY_MS = 150;

/**
 * Отложенное действие с отменой предыдущего.
 *
 * Нужно, чтобы меню не мигало, когда курсор проезжает по нескольким разделам:
 * каждое новое наведение отменяет запланированное действие предыдущего.
 *
 * Таймер один на всё меню, а не по одному на выпадающее: раскрыта всегда
 * максимум одна цепочка, и наведения идут строго друг за другом.
 *
 * Отвечает только за то, КОГДА срабатывает действие. Что именно открыто —
 * дело useNavMenu.
 */
export function useHoverIntent(delayMs: number = DEFAULT_DELAY_MS) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = () => {
    if (timerRef.current !== undefined) clearTimeout(timerRef.current);
  };

  const schedule = (action: () => void) => {
    cancel();
    timerRef.current = setTimeout(action, delayMs);
  };

  // Таймер, доживший до размонтирования, дёрнул бы setState у мёртвого
  // компонента. Заодно снимает подвисший таймер при быстром уходе мышью.
  useEffect(() => cancel, [cancel]);

  return { schedule, cancel };
}
