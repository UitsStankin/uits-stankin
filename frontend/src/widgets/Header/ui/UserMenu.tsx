import type { RefObject } from 'react';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import type { ProfileMenuItem } from '../lib/profileMenu';

interface UserMenuProps {
  /** Отображаемое имя: «Имя Фамилия», иначе логин. */
  displayName: string;
  email: string | null;
  /** Путь к аватару; `null` — покажем заглушку. */
  avatarUrl: string | null;
  items: readonly ProfileMenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  /** Закрыть после перехода по пункту. */
  onNavigate: () => void;
  /** Выход: гасит сессию на сервере и забывает её локально. */
  onLogout: () => void;
  /** Для закрытия по клику вне — вешается на обёртку. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/**
 * Меню профиля справа в шапке: аватар, имя и выпадающий список.
 *
 * Чистый: ничего не помнит и не решает, всё приходит пропсами.
 */
export function UserMenu({
  displayName,
  email,
  avatarUrl,
  items,
  isOpen,
  onToggle,
  onNavigate,
  onLogout,
  containerRef,
}: UserMenuProps) {
  const avatarSrc = avatarUrl ?? DEFAULT_AVATAR_URL;

  return (
    <div ref={containerRef} className="u-user">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="profile-menu"
        className="u-user-btn"
      >
        <img src={avatarSrc} alt="" className="u-user-ava" aria-hidden />
        <span className="u-user-name">{displayName}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div id="profile-menu" className="u-user-panel">
          <div className="u-user-id">
            <img src={avatarSrc} alt="" className="u-user-ava" aria-hidden />
            <div className="min-w-0">
              <strong>{displayName}</strong>
              {email && <small>{email}</small>}
            </div>
          </div>

          <ul>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  {item.kind === 'logout' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate();
                        onLogout();
                      }}
                      className="u-user-item"
                    >
                      <Icon size={18} className="shrink-0" aria-hidden />
                      {item.title}
                    </button>
                  ) : (
                    <Link to={item.path} onClick={onNavigate} className="u-user-item">
                      <Icon size={18} className="shrink-0" aria-hidden />
                      {item.title}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
