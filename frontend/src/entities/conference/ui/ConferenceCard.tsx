import { Link } from 'react-router';
import { CalendarDays } from 'lucide-react';

import { cn, formatDate } from '@shared/lib';
import type { Conference } from '@shared/types';

import { conferenceDatesLabel } from '../lib/conferencePresenters';

interface ConferenceCardProps {
  conference: Conference;
  /** Адрес детальной страницы. Собирает вызывающий: карточка не знает роутов. */
  href: string;
  className?: string;
}

/**
 * Карточка объявления в списке. Чистая: ни состояния, ни запросов —
 * только `conference` и адрес. Раскладка общая с `NewsCard`: обложка слева,
 * текст справа, кликается вся карточка через растянутую ссылку.
 *
 * Дата в верхней строке подписана «Размещено» — у новости такая же голая:
 * там других дат на карточке нет, а здесь ниже стоят даты проведения,
 * и неподписанная дата публикации читалась бы как дата конференции.
 *
 * Даты проведения — при заголовке, а не в притушенной строке метаданных:
 * посетителю раздела они важнее даты публикации. Организатор и контакты
 * на карточку не выносятся — им место на детальной.
 */
export function ConferenceCard({ conference, href, className }: ConferenceCardProps) {
  const posted = formatDate(conference.createdAt);
  const dates = conferenceDatesLabel(conference.startDate, conference.endDate);

  return (
    // relative + растянутая ссылка ниже: кликается вся карточка, но ссылка
    // в разметке одна — обёртка всего в <a> утащила бы в имя ссылки и дату,
    // и анонс.
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded bg-white shadow-sm transition-shadow',
        'hover:shadow focus-within:shadow sm:flex-row',
        className,
      )}
    >
      {conference.previewImageUrl && (
        <img
          src={conference.previewImageUrl}
          // Когда описания обложки нет, картинка декоративна: всё, что она
          // могла бы сообщить, стоит рядом заголовком.
          alt={conference.previewImageDescription ?? ''}
          loading="lazy"
          className="h-48 w-full shrink-0 object-cover sm:h-auto sm:w-56"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        {posted && (
          <p className="text-sm text-text-muted">
            {/* dateTime — машиночитаемая форма: пользователь видит «27 августа
                2026 г.», а поисковик и диктор получают исходный ISO. */}
            Размещено <time dateTime={conference.createdAt}>{posted}</time>
          </p>
        )}

        <h3 className="text-h5 text-text-heading">
          <Link
            to={href}
            className="after:absolute after:inset-0 hover:text-primary focus-visible:text-primary"
          >
            {conference.title}
          </Link>
        </h3>

        {dates && (
          <p className="flex items-center gap-1.5 text-sm font-bold text-text-heading">
            <CalendarDays size={16} aria-hidden className="shrink-0 text-text-muted" />
            <span className="sr-only">Даты проведения:</span>
            {dates}
            {conference.time && `, начало в ${conference.time}`}
          </p>
        )}

        {conference.description && (
          // Анонс обрезается тремя строками, чтобы объявление с длинным
          // описанием не растягивало карточку вдвое против соседних.
          <p className="line-clamp-3 text-base">{conference.description}</p>
        )}
      </div>
    </article>
  );
}
