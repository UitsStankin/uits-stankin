import { useAuth } from '@features/auth';

import { corpSections, type CorpSection } from '../lib/corpSections';

/** Разделы кабинета, доступные вошедшему. Лейаут не знает, откуда роль. */
export function useCorpSections(): readonly CorpSection[] {
  const { canUseCalendar } = useAuth();

  return corpSections(canUseCalendar);
}
