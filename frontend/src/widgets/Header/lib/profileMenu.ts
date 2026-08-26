import { Command, LogOut, User, type LucideIcon } from 'lucide-react';

import { PERSONAL_ROUTE } from '@shared/config/routes';

interface ProfileMenuItemBase {
  key: string;
  title: string;
  icon: LucideIcon;
}

/** Переход по адресу. */
export interface ProfileMenuLink extends ProfileMenuItemBase {
  kind: 'link';
  path: string;
  /** Открывать в новой вкладке — админка живёт вне SPA. */
  external?: boolean;
}

/**
 * Выход. Отдельный вид, а не ссылка на `/auth/logout`, как было в Angular:
 * серверного выхода в контракте нет, отзывать токен нечем. Выход — это
 * действие в браузере (забыть токен, очистить кэш), и страницы под него
 * не существует. Ссылка на несуществующий роут вела бы в «страница
 * не найдена» и выглядела бы как поломка.
 */
export interface ProfileMenuAction extends ProfileMenuItemBase {
  kind: 'logout';
}

export type ProfileMenuItem = ProfileMenuLink | ProfileMenuAction;

/**
 * Пункты меню профиля. Перенос profileMenuList из nav-profile оригинала.
 *
 * Чистая функция, а не хук: набор зависит только от прав, никакого
 * состояния здесь нет.
 */
export function buildProfileMenu({
  /**
   * Модератор или суперюзер. Именно это условие в оригинале, а не «только
   * суперюзер»: в nav-profile админка добавляется при
   * `profile.isModerator || profile.isSuperuser`.
   */
  canManage,
}: {
  canManage: boolean;
}): ProfileMenuItem[] {
  const items: ProfileMenuItem[] = [
    {
      key: 'profile',
      kind: 'link',
      title: 'Личный кабинет',
      path: PERSONAL_ROUTE,
      icon: User,
    },
  ];

  if (canManage) {
    items.push({
      key: 'admin',
      kind: 'link',
      title: 'Админ-панель',
      path: '/admin',
      icon: Command,
      external: true,
    });
  }

  items.push({
    key: 'logout',
    kind: 'logout',
    title: 'Выход',
    // В оригинале feather icon-power. LogOut выразительнее: «power» читается
    // как выключение устройства, а не выход из аккаунта.
    icon: LogOut,
  });

  return items;
}
