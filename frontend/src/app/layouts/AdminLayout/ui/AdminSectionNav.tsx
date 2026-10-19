import { NavLink } from 'react-router';

import { splitAdminSections, type AdminSection } from '@shared/config/adminNavigation';

interface AdminSectionNavProps {
  sections: readonly AdminSection[];
}

function SectionLink({ section }: { section: AdminSection }) {
  const { title, icon: Icon, path, plannedIn } = section;

  return (
    <li>
      <NavLink to={path} data-planned={plannedIn ? '' : undefined} className="u-adm-link">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span>{title}</span>
        {plannedIn && <span className="sr-only">(скоро)</span>}
      </NavLink>
    </li>
  );
}

/**
 * Меню разделов админки. Чистое: список приходит пропсом, активный пункт
 * определяет роутер. Готовые разделы сверху, готовящиеся — ниже под
 * подписью «Скоро».
 *
 * Колонкой слева, во всю высоту под шапкой, на широком экране и
 * горизонтальной лентой на узком — вертикальный список из девяти пунктов
 * на телефоне отодвинул бы таблицу на второй экран. Это единственное
 * место портала с боковым меню: публичная часть горизонтальная, как
 * в оригинале, а здесь разделов вдвое больше, чем помещается в строку.
 */
export function AdminSectionNav({ sections }: AdminSectionNavProps) {
  const { ready, soon } = splitAdminSections(sections);

  return (
    <nav aria-label="Разделы админки" className="u-adm-nav">
      <ul>
        {ready.map((section) => (
          <SectionLink key={section.key} section={section} />
        ))}

        {soon.length > 0 && (
          <li className="u-adm-group" aria-hidden="true">
            Скоро
          </li>
        )}

        {soon.map((section) => (
          <SectionLink key={section.key} section={section} />
        ))}
      </ul>
    </nav>
  );
}
