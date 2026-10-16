import { Link } from 'react-router';

import { cn, formatDate } from '@shared/lib';
import type { News } from '@shared/types';

import { authorLabel, postTypeLabel } from '../lib/newsPresenters';

interface NewsCardProps {
  news: News;
  /** Адрес детальной страницы. Собирает вызывающий: карточка не знает роутов. */
  href: string;
  className?: string;
}

/**
 * Карточка записи в ленте. Чистая: ни состояния, ни запросов —
 * только `news` и адрес.
 *
 * Форматирование даты и подписи типа считаются прямо здесь, и это не нарушает
 * правила «логика в model»: `formatDate` и `postTypeLabel` — чистые функции
 * от пропсов, а не состояние и не поход в сеть. Вынести их в модель значило бы
 * протаскивать через пропсы три готовые строки вместо одной сущности.
 */
export function NewsCard({ news, href, className }: NewsCardProps) {
  const date = formatDate(news.createdAt);
  const author = authorLabel(news.authorName);

  return (
    // relative + растянутая ссылка ниже: кликается вся карточка, но ссылка
    // в разметке одна. Обёртка всего в <a> утащила бы в имя ссылки
    // и дату, и анонс — диктор читал бы абзац вместо заголовка.
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded bg-white shadow-sm transition-shadow',
        'hover:shadow focus-within:shadow sm:flex-row',
        className,
      )}
    >
      {news.previewImageUrl && (
        <img
          src={news.previewImageUrl}
          // Описание обложки заполняется не всегда. Когда его нет, картинка
          // декоративна: всё, что она могла бы сообщить, стоит рядом
          // заголовком — пустой alt честнее выдуманного.
          alt={news.previewImageDescription ?? ''}
          // Двадцать карточек — двадцать картинок; без lazy они уезжают
          // в сеть все разом и забивают канал ещё до первого экрана.
          loading="lazy"
          className="h-48 w-full shrink-0 object-cover sm:h-auto sm:w-56"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span className="rounded-pill bg-secondary px-2.5 py-0.5 font-bold text-text-heading">
            {postTypeLabel(news.postType)}
          </span>

          {/* dateTime — машиночитаемая форма: пользователь видит «24 июля
              2026 г.», а поисковик и диктор получают исходный ISO. */}
          {date && <time dateTime={news.createdAt}>{date}</time>}

          {author && <span className="truncate">{author}</span>}
        </div>

        <h3 className="text-h5 text-text-heading">
          <Link
            to={href}
            className="after:absolute after:inset-0 hover:text-primary focus-visible:text-primary"
          >
            {news.title}
          </Link>
        </h3>

        {news.shortDescription && (
          // Анонс обрезается тремя строками: в базе поле до 255 символов,
          // и запись, где его заполнили целиком, растянула бы карточку
          // вдвое против соседних.
          <p className="line-clamp-3 text-base">{news.shortDescription}</p>
        )}
      </div>
    </article>
  );
}
