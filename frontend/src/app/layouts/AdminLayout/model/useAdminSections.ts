import { useAuth } from '@features/auth';
import { ADMIN_SECTIONS, type AdminSection } from '@shared/config/adminNavigation';

/**
 * Разделы админки, доступные вошедшему.
 *
 * Скрытый пункт — не защита, а вежливость: за дверью всё равно стоит
 * `RoleRoute`, а на бэкенде — `@PreAuthorize`. Но показывать модератору
 * «Учётные записи», зная, что он получит там отказ, значит предлагать
 * ему сходить за `403`.
 */
export function useAdminSections(): readonly AdminSection[] {
  const { isAdmin } = useAuth();

  return ADMIN_SECTIONS.filter((section) => section.access !== 'admin' || isAdmin);
}
