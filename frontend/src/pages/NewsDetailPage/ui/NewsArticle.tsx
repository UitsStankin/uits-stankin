import { authorLabel, postTypeLabel } from '@entities/news';
import { formatDateTime } from '@shared/lib';
import { RichText } from '@shared/ui/RichText';
import type { News } from '@shared/types';

interface NewsArticleProps {
  news: News;
}

/**
 * Статья целиком. Чистая: получает запись и рисует её.
 *
 * `content` — HTML из rich-text-редактора, и показывает его общий
 * `shared/ui/RichText`: там же разобрано, почему границей, отсекающей
 * чужой исполняемый код, выбран бэкенд, а не браузер.
 */
export function NewsArticle({ news }: NewsArticleProps) {
  const date = formatDateTime(news.createdAt);
  const author = authorLabel(news.authorName);

  return (
    <article className="rounded bg-white p-6 shadow-sm md:p-8">
      <header className="flex flex-col gap-3 border-b border-default pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span className="rounded-pill bg-secondary px-2.5 py-0.5 font-bold text-text-heading">
            {postTypeLabel(news.postType)}
          </span>

          {date && <time dateTime={news.createdAt}>{date}</time>}

          {author && <span>{author}</span>}
        </div>

        <h1 className="text-h3 text-text-heading">{news.title}</h1>

        {news.shortDescription && (
          <p className="text-lg leading-normal text-text-default">{news.shortDescription}</p>
        )}
      </header>

      {news.previewImageUrl && (
        <img
          src={news.previewImageUrl}
          alt={news.previewImageDescription ?? ''}
          // Высота ограничена: бэкенд ужимает картинку до 1600 px по стороне,
          // и квадратная обложка на всю ширину карточки заняла бы экран
          // целиком — статья начиналась бы с прокрутки, а не с текста.
          className="mt-6 max-h-[26rem] w-full rounded object-cover"
        />
      )}

      <RichText html={news.content} className="mt-6" />
    </article>
  );
}
