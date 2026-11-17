import { NavLink } from 'react-router';

import { cn } from '@shared/lib';

import type { CorpSection } from '../lib/corpSections';

interface CorpSectionNavProps {
  sections: readonly CorpSection[];
}

/**
 * Вкладки личного кабинета. Чистые: список приходит пропсом, активную
 * определяет роутер.
 *
 * **Строкой, а не боковым меню, как в оригинале.** Раскладка портала
 * горизонтальная, и колонка слева ради двух пунктов отняла бы у календаря
 * треть ширины. Оформлены так же, как строка меню портала, — подчёркиванием.
 *
 * Один пункт — не меню: вкладка, ведущая на ту же страницу, где уже
 * стоишь, ничего не даёт. Тем, кому календарь закрыт, строки нет вовсе.
 */
export function CorpSectionNav({ sections }: CorpSectionNavProps) {
  if (sections.length < 2) return null;

  return (
    <nav aria-label="Разделы личного кабинета" className="border-b border-default">
      <ul className="flex justify-center gap-1">
        {sections.map(({ key, title, path, icon: Icon }) => (
          <li key={key}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                cn(
                  '-mb-px flex h-12 items-center gap-2 border-b-2 px-3 text-base transition-colors',
                  isActive
                    ? 'border-primary font-bold text-text-heading'
                    : 'border-transparent text-text-default hover:text-primary',
                )
              }
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{title}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
