import { Command, LogOut, User, type LucideIcon } from 'lucide-react';

export interface ProfileMenuItem {
  key: string;
  title: string;
  path: string;
  icon: LucideIcon;
  /** Открывать в новой вкладке — админка живёт вне SPA. */
  external?: boolean;
}

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
      title: 'Личный кабинет',
      path: '/corp/personal',
      icon: User,
    },
  ];

  if (canManage) {
    items.push({
      key: 'admin',
      title: 'Админ-панель',
      path: '/admin',
      icon: Command,
      external: true,
    });
  }

  items.push({
    key: 'logout',
    title: 'Выход',
    path: '/auth/logout',
    // В оригинале feather icon-power. LogOut выразительнее: «power» читается
    // как выключение устройства, а не выход из аккаунта.
    icon: LogOut,
  });

  return items;
}
