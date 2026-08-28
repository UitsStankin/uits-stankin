import { authorLabel, postTypeLabel } from '@entities/news';
import { formatDateTime } from '@shared/lib';
import type { News } from '@shared/types';

interface NewsArticleProps {
  news: News;
}

/**
 * Статья целиком. Чистая: получает запись и рисует её.
 *
 * ### Почему здесь `dangerouslySetInnerHTML`
 *
 * `content` — это HTML из rich-text-редактора, и другого способа показать
 * его разметкой не существует. Опасность у приёма ровно одна: чужой
 * исполняемый код в тексте. Границей, на которой он отсекается, выбран
 * **бэкенд**, а не браузер:
 *
 * * `NewsService` прогоняет `content` через `HtmlSanitizer.sanitize` — и на
 *   создании, и на правке (T-21, вынесено в общий класс в T-35). Внутри
 *   `Jsoup.clean` по белому списку `Safelist.relaxed()`. Взят белый список,
 *   а не вырезание `<script>`: код прячется в атрибутах (`onerror`) и в схеме
 *   `javascript:` внутри `href`, поэтому перечень опасного неполон
 *   по определению, а перечень нужного новости — конечен;
 * * пустой после чистки текст бэкенд не сохраняет вовсе — отвечает `400`
 *   со словарём `errors` по полю `content`. То есть новость с пустым
 *   `content` в выдаче появиться не может, и ветки под неё здесь нет;
 * * это покрыто интеграционными тестами: скрипт при создании и при
 *   обновлении, `onerror` в теге без слова `script`, относительная картинка.
 *
 * Второй санитайзер на клиенте не ставится сознательно. Он стал бы вторым
 * источником правды о допустимых тегах, и в момент, когда его список
 * окажется строже jsoup'ового, у модератора молча пропадёт форматирование —
 * причём только у части читателей, что ловится месяцами.
 *
 * Условие, при котором решение перестаёт быть верным, ровно одно и записано
 * в ARCHITECTURE §7: перенос старой базы, где Quill-HTML никогда не чистился.
 * Дамп пойдёт в таблицу мимо `NewsService`, то есть мимо санитайзера. Импорт
 * обязан чистить сам; если этого не сделают — сюда придёт `dompurify`,
 * и это осознанный размен, а не забытая дыра.
 *
 * Для `text` редактируемых страниц (F-23) приём **не годится**: там в базе
 * лежит исходник Markdown, который бэкенд не санитизирует вовсе, — его
 * рендерит `react-markdown` без `rehype-raw` (docs/API.md).
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

      {/* prose из @tailwindcss/typography: у пришедшего HTML своих классов
          нет, а сброс Tailwind снимает стили с h2, ul и blockquote —
          без него статья выглядит одним сплошным абзацем.
          max-w-none: ширину держит карточка, а не типографика. */}
      <div
        className="prose prose-sm mt-6 max-w-none prose-headings:text-text-heading prose-a:text-primary prose-img:rounded"
        dangerouslySetInnerHTML={{ __html: news.content }}
      />
    </article>
  );
}
