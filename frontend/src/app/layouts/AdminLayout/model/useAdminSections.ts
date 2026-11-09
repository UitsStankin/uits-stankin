import { useAuth } from '@features/auth';
import { visibleAdminSections, type AdminSection } from '@shared/config/adminNavigation';

/**
 * Разделы админки, доступные вошедшему.
 *
 * Хук ровно для того, чтобы лейаут не знал, откуда берётся роль: само
 * правило отбора живёт рядом со списком разделов и общее с витриной
 * `/admin` (`shared/config/adminNavigation.ts`).
 */
export function useAdminSections(): readonly AdminSection[] {
  const { isAdmin } = useAuth();

  return visibleAdminSections(isAdmin);
}
