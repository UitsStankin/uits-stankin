import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eventsQuery } from '@entities/event';
import type { UserEvent } from '@shared/types';

import { calendarItems, type CalendarItem } from '../lib/calendarItems';
import {
  type CalendarViewKind,
  calendarTitle,
  containsDay,
  shiftAnchor,
  startOfDay,
} from '../lib/calendarNavigation';

export type CalendarPageState = {
  view: CalendarViewKind;
  /** Любой день видимого промежутка; календарь показывает тот, где он лежит. */
  anchor: Date;
  title: string;
  isShowingToday: boolean;
  setView: (view: CalendarViewKind) => void;
  showPrevious: () => void;
  showNext: () => void;
  showToday: () => void;
  items: readonly CalendarItem[];
  /** Событие, открытое по клику; `null` — окно закрыто. */
  selected: UserEvent | null;
  select: (id: number) => void;
  closeSelected: () => void;
  isLoading: boolean;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  /** Событий нет ни одного — ни в этом месяце, ни в каком. */
  isEmpty: boolean;
};

/**
 * Состояние страницы календаря: какой вид, какая дата, какое событие
 * открыто — и выдача событий.
 *
 * Вид и дата живут в состоянии компонента, а не в адресе. В оригинале
 * их там тоже не было, а адрес с `?view=week&date=…` полезен для ссылки
 * коллеге — но коллега увидит **свой** календарь, а не мой, и ссылка
 * на чужую неделю ничего ему не скажет.
 *
 * Пустой календарь — не повод прятать сетку: в ней создают событие (F-60),
 * поэтому `isEmpty` даёт подсказку над ней, а не вместо неё.
 */
export function useCalendarPage(): CalendarPageState {
  const [view, setView] = useState<CalendarViewKind>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const query = useQuery(eventsQuery());
  const events = query.data ?? [];

  // Открытое событие ищется в свежей выдаче, а не хранится копией:
  // пропавшее после перезапроса закроет окно само.
  const selected = events.find(({ id }) => id === selectedId) ?? null;

  return {
    view,
    anchor,
    title: calendarTitle(view, anchor),
    isShowingToday: containsDay(view, anchor, new Date()),
    setView,
    showPrevious: () => setAnchor(shiftAnchor(view, anchor, -1)),
    showNext: () => setAnchor(shiftAnchor(view, anchor, 1)),
    showToday: () => setAnchor(startOfDay(new Date())),
    items: calendarItems(events),
    selected,
    select: setSelectedId,
    closeSelected: () => setSelectedId(null),
    isLoading: query.isLoading,
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
    isEmpty: query.data !== undefined && query.data.length === 0,
  };
}
