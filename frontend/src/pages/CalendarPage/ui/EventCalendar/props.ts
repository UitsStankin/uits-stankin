import type { CalendarItem } from '../../lib/calendarItems';
import type { CalendarViewKind } from '../../lib/calendarNavigation';

/**
 * Пропсы календаря — отдельным файлом, как у редактора: их делят обёртка
 * `index.tsx` и ленивый `FullCalendarView.tsx`, и импорт типа из ленивого
 * модуля в обёртку затащил бы его в основной кусок.
 */
export interface EventCalendarProps {
  view: CalendarViewKind;
  anchor: Date;
  items: readonly CalendarItem[];
  onItemClick: (id: number) => void;
}
