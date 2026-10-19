import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

import { splitAdminSections, visibleAdminSections } from '@shared/config/adminNavigation';
import { useAuth } from '@features/auth';

/**
 * Главная админки: готовые разделы списком с подписью, что в них делают,
 * и одной строкой — те, что ещё готовятся.
 */
export default function AdminHomePage() {
  const { isAdmin } = useAuth();

  const { ready, soon } = splitAdminSections(visibleAdminSections(isAdmin));

  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="u-page-title">Управление сайтом</h1>

      <p className="max-w-prose text-base text-text-muted">
        Выберите, что нужно изменить на сайте кафедры.
      </p>

      <ul className="u-adm-tasks">
        {ready.map(({ key, title, icon: Icon, path, hint }) => (
          <li key={key}>
            <Link to={path} className="u-adm-task">
              <Icon aria-hidden="true" className="size-5 shrink-0" />

              <span className="u-adm-task-text">
                <strong>{title}</strong>
                {hint && <small>{hint}</small>}
              </span>

              <ChevronRight aria-hidden="true" className="u-adm-task-go size-5 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>

      {soon.length > 0 && (
        <p className="max-w-prose text-sm text-text-muted">
          Скоро: {soon.map((section) => section.title.toLowerCase()).join(', ')}.
        </p>
      )}
    </div>
  );
}
