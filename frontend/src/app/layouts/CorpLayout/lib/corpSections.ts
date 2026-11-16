import { CalendarDays, User, type LucideIcon } from 'lucide-react';

import { CALENDAR_ROUTE, PERSONAL_ROUTE } from '@shared/config/routes';

export interface CorpSection {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
}

/**
 * Разделы личного кабинета — меню `/corp` оригинала (`corp.component.ts`):
 * «Профиль» и «Календарь событий».
 *
 * В оригинале оба пункта получали только суперпользователь и преподаватель,
 * а у остальных меню было пустым. Здесь «Личный кабинет» есть у всех
 * вошедших — страница им открыта, — а календарь только у тех, кому открыта
 * его ручка.
 */
export function corpSections(canUseCalendar: boolean): readonly CorpSection[] {
  const personal: CorpSection = {
    key: 'personal',
    title: 'Личный кабинет',
    path: PERSONAL_ROUTE,
    icon: User,
  };

  if (!canUseCalendar) return [personal];

  return [
    personal,
    { key: 'calendar', title: 'Календарь событий', path: CALENDAR_ROUTE, icon: CalendarDays },
  ];
}
