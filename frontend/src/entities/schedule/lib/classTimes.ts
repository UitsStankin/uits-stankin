import type { ClassTime } from '@shared/types';

/**
 * Время пар. В ответе его нет: соответствие номера времени фиксировано
 * (docs/API.md, «Как читать поля»). Начала — из контракта, концы —
 * из таблицы старого портала (`schedule.ts`), контракт их не называет.
 */
const CLASS_TIMES: Record<ClassTime, { start: string; end: string }> = {
  1: { start: '8:30', end: '10:10' },
  2: { start: '10:20', end: '12:00' },
  3: { start: '12:20', end: '14:00' },
  4: { start: '14:10', end: '15:50' },
  5: { start: '16:00', end: '17:40' },
  6: { start: '18:00', end: '19:30' },
  7: { start: '19:40', end: '21:10' },
  8: { start: '21:20', end: '22:50' },
};

/** «8:30–10:10». */
export function classTimeRange(classTime: ClassTime): string {
  const { start, end } = CLASS_TIMES[classTime];
  return `${start}–${end}`;
}
