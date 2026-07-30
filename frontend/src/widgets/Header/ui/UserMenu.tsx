interface UserMenuProps {
  /** Инициал или иное содержимое аватара. */
  label?: string;
  onClick?: () => void;
}

/**
 * Кнопка профиля справа в шапке.
 *
 * ЗАГЛУШКА: у портала здесь «Вход для персонала» до входа и меню профиля
 * после. Реальный вид появится вместе с переписыванием useAuth — сейчас
 * он моковый и типы в нём не совпадают с docs/API.md.
 */
export function UserMenu({ label = 'U', onClick }: UserMenuProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded p-1 hover:bg-gray-100"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-medium text-white">
        {label}
      </span>
    </button>
  );
}
