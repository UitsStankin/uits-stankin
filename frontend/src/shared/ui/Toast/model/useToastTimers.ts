import { useEffect, useRef } from 'react';

import type { ToastMessage, ToastTone } from '@shared/store';

/**
 * Сколько сообщение висит на экране, миллисекунды.
 *
 * Успех — короче: его ждали, текст в одну строку («Дисциплина сохранена»),
 * и плашка только загораживает таблицу. Отказ — дольше: его не ждали,
 * и в нём бывает то, что нужно прочитать и обдумать («Дисциплина назначена
 * преподавателям (3), сначала снять её с карточек»).
 *
 * Совсем без таймера отказ оставлять нельзя: тост — не диалог, закрывать
 * его никто не обязан, и к концу рабочего дня админ смотрел бы на таблицу
 * из-за стопки старых сообщений.
 */
const TIMEOUT_MS: Record<ToastTone, number> = {
  success: 4_000,
  error: 10_000,
};

/**
 * Заводит таймер снятия на каждое сообщение и гасит его, когда сообщение
 * ушло.
 *
 * Таймеры лежат в `ref`, а не заводятся заново на каждый прогон эффекта.
 * Иначе третий тост продлевал бы жизнь первым двум: эффект снял бы их
 * таймеры и поставил новые, полной длины, — и сообщения снимались бы
 * не по очереди, а пачкой, всё позже и позже.
 *
 * Здесь, а не в сторе: таймер, заведённый при добавлении сообщения,
 * тикал бы и в тестах чистых функций, и в свёрнутой вкладке, а снимать
 * ему было бы нечего. Здесь он живёт ровно столько, сколько виджет
 * на экране.
 */
export function useToastTimers(toasts: readonly ToastMessage[], dismiss: (id: number) => void) {
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    for (const { id, tone } of toasts) {
      if (timers.current.has(id)) continue;

      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TIMEOUT_MS[tone]),
      );
    }

    // Сообщение могли закрыть крестиком раньше срока — его таймер больше
    // не нужен, а `Map` без уборки росла бы до перезагрузки страницы.
    for (const [id, timer] of timers.current) {
      if (toasts.some((message) => message.id === id)) continue;

      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, [toasts, dismiss]);

  // Размонтирование виджета — переход на страницу входа, например: висящий
  // таймер дёрнул бы стор уже после того, как показывать стало негде.
  useEffect(() => {
    const pending = timers.current;

    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);
}
