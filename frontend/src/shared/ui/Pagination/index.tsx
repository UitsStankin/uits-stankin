import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@shared/lib';

import { pageRange } from './pageRange';

interface PaginationProps {
  /** Текущая страница, счёт **с единицы**. */
  page: number;
  totalPages: number;
  /**
   * Адрес страницы с указанным номером. Пагинатор не знает ни текущего
   * пути, ни имени query-параметра — это дело вызывающей страницы,
   * и у ленты новостей оно одно, а у списка с фильтрами будет другое.
   */
  buildHref: (page: number) => string;
  className?: string;
}

/**
 * Постраничная навигация. Чистая: ничего не помнит и никуда не ходит.
 *
 * Номера — **ссылки, а не кнопки**. Страница живёт в адресе, значит её можно
 * открыть в новой вкладке, переслать и добавить в закладки; кнопка с `onClick`
 * всё это отняла бы, а браузер перестал бы подсвечивать посещённое.
 *
 * Живёт в `shared/ui`, потому что F-14 — эталонный модуль: тем же списком
 * со спринговой пагинацией приходят преподаватели, конференции, достижения
 * и публикации (FRONTEND_BACKLOG, блок 2).
 */
export default function Pagination({ page, totalPages, buildHref, className }: PaginationProps) {
  // Одна страница — это не «пагинатор из одной кнопки», а его отсутствие.
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Постраничная навигация" className={cn('flex justify-center', className)}>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <Arrow
            href={buildHref(page - 1)}
            disabled={page <= 1}
            label="Предыдущая страница"
            icon={<ChevronLeft size={16} aria-hidden />}
          />
        </li>

        {pageRange(page, totalPages).map((slot, index) =>
          slot === 'gap' ? (
            // Многоточие не интерактивно и ничего не сообщает диктору —
            // счёт страниц он уже услышал в номерах вокруг.
            // Ключом может быть только позиция: у пропуска нет своего
            // значения, а порядок слотов детерминирован номером страницы.
            <li key={`gap-${index}`} aria-hidden className="px-2 text-text-muted">
              …
            </li>
          ) : (
            <li key={slot}>
              {slot === page ? (
                <span aria-current="page" className={cn(slotClass, 'bg-primary text-white')}>
                  {slot}
                </span>
              ) : (
                <Link
                  to={buildHref(slot)}
                  aria-label={`Страница ${slot}`}
                  className={cn(slotClass, 'bg-white text-text-default hover:bg-secondary')}
                >
                  {slot}
                </Link>
              )}
            </li>
          ),
        )}

        <li>
          <Arrow
            href={buildHref(page + 1)}
            disabled={page >= totalPages}
            label="Следующая страница"
            icon={<ChevronRight size={16} aria-hidden />}
          />
        </li>
      </ul>
    </nav>
  );
}

const slotClass =
  'flex h-9 min-w-9 items-center justify-center rounded px-3 text-base font-bold shadow-sm transition-colors';

/**
 * Стрелка «туда-сюда». На краю списка это `span`, а не ссылка
 * с `pointer-events: none`: отключённая на вид, но живая ссылка остаётся
 * доступной с клавиатуры и уводит на несуществующую страницу.
 */
function Arrow({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled: boolean;
  label: string;
  icon: ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-hidden className={cn(slotClass, 'bg-white text-gray-500 opacity-50')}>
        {icon}
      </span>
    );
  }

  return (
    <Link
      to={href}
      aria-label={label}
      className={cn(slotClass, 'bg-white text-text-default hover:bg-secondary')}
    >
      {icon}
    </Link>
  );
}
