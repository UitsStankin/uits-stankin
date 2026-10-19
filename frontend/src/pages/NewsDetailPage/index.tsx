import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';

import { ANNOUNCEMENTS_ROUTE, NEWS_ROUTE } from '@shared/config/routes';
import { readFeedUrl } from '@shared/lib';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useNewsItem } from './model/useNewsItem';
import { NewsArticle } from './ui/NewsArticle';
import { NewsArticleSkeleton } from './ui/NewsArticleSkeleton';

/**
 * Одна новость или объявление — адрес у записи один на оба раздела
 * (`shared/config/routes.ts`).
 *
 * Сборка: состояние из модели, разметка из чистых компонентов.
 *
 * Ссылка «ко всем» ведёт на первую страницу своей ленты, а не «назад»
 * по истории: на страницу попадают и из поиска, и по присланному адресу,
 * и `history.back()` увёл бы такого посетителя с портала совсем.
 *
 * Исключение — читатель, пришедший из самой ленты (карточка кладёт в переход
 * её адрес): ему ссылка возвращает на ту же страницу и в то же место
 * прокрутки. Для этого обычный клик делает шаг назад по истории, а адрес
 * в `href` остаётся настоящим — чтобы ссылку можно было открыть в новой
 * вкладке.
 *
 * Своей — это по `postType` записи, а не по `/about/news` всегда. С F-20
 * лента новостей отфильтрована, и объявление, уводившее «ко всем новостям»,
 * отправляло бы читателя в список, где его самого нет. Пока запись едет,
 * тип неизвестен и подпись говорит про новости: это первый экран по прямой
 * ссылке, а при переходе из ленты запись уже в кэше и подпись сразу верная.
 */
export default function NewsDetailPage() {
  const { news, isLoading, isOffline, isNotFound, isError, errorMessage, refetch } = useNewsItem();

  const location = useLocation();
  const navigate = useNavigate();

  const isAnnouncement = news?.postType === 'announcements';
  const feedRoute = isAnnouncement ? ANNOUNCEMENTS_ROUTE : NEWS_ROUTE;
  const feedUrl = readFeedUrl(location.state);

  function stepBackToFeed(event: MouseEvent<HTMLAnchorElement>) {
    const index: unknown = window.history.state?.idx;
    const canStepBack = typeof index === 'number' && index > 0;
    const isPlainClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

    if (feedUrl === null || !canStepBack || !isPlainClick) return;

    event.preventDefault();
    void navigate(-1);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Link to={feedUrl ?? feedRoute} onClick={stepBackToFeed} className="u-btn-ghost w-fit">
        <ChevronLeft size={16} aria-hidden />
        {isAnnouncement ? 'Ко всем объявлениям' : 'Ко всем новостям'}
      </Link>

      {isLoading && <NewsArticleSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isNotFound && (
        <StatusBlock
          title="Новость не найдена"
          // Скрытая и несуществующая запись неразличимы по контракту —
          // и текст не должен подсказывать, что именно из двух случилось.
          description="Возможно, её удалили или сняли с публикации, а ссылка осталась."
          // Здесь ведём в новости всегда: записи нет, тип неизвестен,
          // и угадывать раздел не по чему.
          action={<ActionLink to={NEWS_ROUTE}>К ленте новостей</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить новость"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {news && <NewsArticle news={news} />}
    </div>
  );
}
