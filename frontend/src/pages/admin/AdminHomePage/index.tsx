import { Link } from 'react-router';

import { visibleAdminSections } from '@shared/config/adminNavigation';
import { useAuth } from '@features/auth';

/**
 * Витрина админки: с чего начать.
 *
 * Голый `/admin` — это раздел, а не страница, и в портале такие адреса
 * уводят на первый готовый экран (`/corp`, `/auth`). Здесь так не сделано
 * намеренно: разделов девять, «первый» из них сегодня — заглушка F-43,
 * и редирект на неё выглядел бы поломкой. Плитки заодно дают вход
 * в разделы с телефона, где меню сворачивается в ленту.
 */
export default function AdminHomePage() {
  const { isAdmin } = useAuth();

  const sections = visibleAdminSections(isAdmin);

  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Управление порталом</h1>

      <p className="max-w-prose text-base text-text-muted">
        Содержимое сайта правится здесь. Раздел виден администратору и модератору; учётными
        записями распоряжается только администратор.
      </p>

      <ul className="grid gap-gutter-sm sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ key, title, icon: Icon, path, plannedIn }) => (
          <li key={key}>
            <Link
              to={path}
              className="flex h-full items-start gap-3 rounded bg-white p-gutter-sm shadow-sm transition-shadow hover:shadow"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />

              <span className="flex flex-col gap-1">
                <span className="text-base font-bold text-text-heading">{title}</span>

                {/* У готового раздела подписи нет вовсе: «работает»
                    писать под каждым — шум, а вот «появится с F-43»
                    отвечает на вопрос, который иначе задают в чате. */}
                {plannedIn && (
                  <span className="text-sm text-text-muted">Появится с {plannedIn}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
