import type { RefObject } from 'react';
import { Link } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import type { ProfileMenuItem } from '../lib/profileMenu';

/**
 * Аватар, когда пользователь свой не загрузил: в контракте поле `avatar`
 * приходит как `null`, и пустой `src` дал бы битую картинку.
 */
const DEFAULT_AVATAR_URL = '/assets/images/avatars/default-user.png';

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
  /** Выход. Локальный: запроса на сервер за ним не стоит. */
  onLogout: () => void;
  /** Для закрытия по клику вне — вешается на обёртку. */
  containerRef: RefObject<HTMLDivElement | null>;
}

/** Пункты меню выглядят одинаково, ссылка это или кнопка. */
const itemClass =
  'flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-900 transition-colors hover:bg-gray-100 hover:text-primary';

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="profile-menu"
        className="flex items-center gap-2 rounded p-1 transition-colors hover:bg-gray-100"
      >
        <img
          src={avatarSrc}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
          // Аватар декоративный: имя рядом уже озвучено, дублировать незачем.
          aria-hidden
        />
        <span className="hidden text-sm font-bold text-gray-900 sm:inline">
          {displayName}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn('shrink-0 text-gray-900 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          id="profile-menu"
          className={cn(
            // Те же параметры панели, что у выпадающих навбара:
            // белая, тень 0 2px 12px rgba(0,0,0,.1), радиус $border-radius.
            'absolute top-full right-0 z-dropdown mt-2 w-64 rounded bg-white py-1.25',
            'shadow-[0_2px_12px_0_rgba(0,0,0,0.1)]'
          )}
        >
          <div className="flex items-center gap-2 border-b border-default px-3 pb-2">
            <img src={avatarSrc} alt="" className="h-10 w-10 rounded-full object-cover" aria-hidden />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold text-gray-900">{displayName}</span>
              {email && <span className="truncate text-xs text-text-default">{email}</span>}
            </div>
          </div>

          <ul className="pt-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  {item.kind === 'logout' ? (
                    // Кнопка, а не ссылка: за выходом не стоит адреса,
                    // он ничего не открывает.
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate();
                        onLogout();
                      }}
                      className={itemClass}
                    >
                      <Icon size={18} className="shrink-0" aria-hidden />
                      {item.title}
                    </button>
                  ) : item.external ? (
                    // Админка живёт вне SPA, поэтому обычная ссылка в новую
                    // вкладку, а не переход роутером.
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noreferrer"
                      onClick={onNavigate}
                      className={itemClass}
                    >
                      <Icon size={18} className="shrink-0" aria-hidden />
                      {item.title}
                    </a>
                  ) : (
                    <Link to={item.path} onClick={onNavigate} className={itemClass}>
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
