import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { eventsQuery } from '@entities/event';
import { useDeleteEvent } from '@features/manage-events';
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
  /** Окно формы: правка открытого события или новое. `null` — закрыто. */
  editing: { event: UserEvent | null } | null;
  /**
   * День нового события: сегодня, если оно на экране, иначе — первый
   * день видимого месяца, недели или дня (туда листание ставит дату).
   */
  newEventDay: Date;
  startCreate: () => void;
  startEdit: () => void;
  closeEditor: () => void;
  /** Событие, удаление которого ждёт подтверждения. */
  deleting: UserEvent | null;
  askDelete: () => void;
  cancelDelete: () => void;
  confirmDelete: () => void;
  isDeleting: boolean;
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
 * Пустой календарь — не повод прятать сетку: созданное событие появится
 * в ней, поэтому `isEmpty` даёт подсказку над ней, а не вместо неё.
 *
 * **Одно окно за раз** (F-60), выбор — `mode`: карточка открытого события,
 * его правка, подтверждение удаления или новое событие. Правка и удаление
 * открываются из карточки, а не прямо по клику, как в оригинале: там клик
 * вёл сразу в форму, и посмотреть событие можно было только в ней, а
 * назначенному чаще нужно прочитать, чем править. Править и удалять может
 * всякий, кто событие видит (владелец и назначенные, docs/API.md), поэтому
 * кнопки в карточке есть всегда.
 *
 * После сохранения и удаления окно закрывается совсем, как формы админки:
 * карточка, открытая сразу, показала бы старые данные до прихода свежей
 * выдачи.
 */
export function useCalendarPage(): CalendarPageState {
  const [view, setView] = useState<CalendarViewKind>('month');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'delete'>('view');

  const query = useQuery(eventsQuery());
  const events = query.data ?? [];

  // Открытое событие ищется в свежей выдаче, а не хранится копией:
  // пропавшее после перезапроса закроет окно само.
  const selected = events.find(({ id }) => id === selectedId) ?? null;

  const close = () => {
    setSelectedId(null);
    setMode('view');
  };

  const deletion = useDeleteEvent({
    onDeleted: close,
    // Отказ возвращает к карточке: тост сказал, почему не вышло.
    onSettled: () => setMode((current) => (current === 'delete' ? 'view' : current)),
  });

  const isShowingToday = containsDay(view, anchor, new Date());

  return {
    view,
    anchor,
    title: calendarTitle(view, anchor),
    isShowingToday,
    setView,
    showPrevious: () => setAnchor(shiftAnchor(view, anchor, -1)),
    showNext: () => setAnchor(shiftAnchor(view, anchor, 1)),
    showToday: () => setAnchor(startOfDay(new Date())),
    items: calendarItems(events),
    selected,
    select: (id) => {
      setSelectedId(id);
      setMode('view');
    },
    closeSelected: close,
    editing:
      mode === 'create' ? { event: null } : mode === 'edit' && selected ? { event: selected } : null,
    newEventDay: isShowingToday ? startOfDay(new Date()) : anchor,
    startCreate: () => {
      setSelectedId(null);
      setMode('create');
    },
    startEdit: () => setMode('edit'),
    closeEditor: close,
    deleting: mode === 'delete' ? selected : null,
    askDelete: () => setMode('delete'),
    cancelDelete: () => setMode('view'),
    confirmDelete: () => {
      if (selected) deletion.remove(selected);
    },
    isDeleting: deletion.isPending,
    isLoading: query.isLoading,
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
    isEmpty: query.data !== undefined && query.data.length === 0,
  };
}
