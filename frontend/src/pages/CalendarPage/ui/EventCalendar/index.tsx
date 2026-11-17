import { Suspense, lazy } from 'react';

import Loader from '@shared/ui/Loader';

import type { EventCalendarProps } from './props';

/**
 * FullCalendar приезжает отдельным куском — по тому же правилу, что
 * редактор (D-F6): отделять то, что публичному посетителю не нужно ни при
 * каких условиях. Календарь видят только преподаватель и администратор,
 * и только после входа.
 *
 * Отложен сам календарь, а не страница: события начинают грузиться сразу,
 * параллельно с куском, а не после него.
 */
const FullCalendarView = lazy(() => import('./FullCalendarView'));

export function EventCalendar(props: EventCalendarProps) {
  return (
    <Suspense fallback={<Loader />}>
      <FullCalendarView {...props} />
    </Suspense>
  );
}
