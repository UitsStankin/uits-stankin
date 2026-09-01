import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

import { ANNOUNCEMENTS_ROUTE, NEWS_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';

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
 * Своей — это по `postType` записи, а не по `/about/news` всегда. С F-20
 * лента новостей отфильтрована, и объявление, уводившее «ко всем новостям»,
 * отправляло бы читателя в список, где его самого нет. Пока запись едет,
 * тип неизвестен и подпись говорит про новости: это первый экран по прямой
 * ссылке, а при переходе из ленты запись уже в кэше и подпись сразу верная.
 */
export default function NewsDetailPage() {
  const { news, isLoading, isOffline, isNotFound, isError, errorMessage, refetch } = useNewsItem();

  const isAnnouncement = news?.postType === 'announcements';
  const feedRoute = isAnnouncement ? ANNOUNCEMENTS_ROUTE : NEWS_ROUTE;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter-sm">
      <Link
        to={feedRoute}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />
        {isAnnouncement ? 'Ко всем объявлениям' : 'Ко всем новостям'}
      </Link>

      {isLoading && <NewsArticleSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={
            <button type="button" onClick={refetch} className={actionClass}>
              Повторить
            </button>
          }
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
          action={
            <Link to={NEWS_ROUTE} className={actionClass}>
              К ленте новостей
            </Link>
          }
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить новость"
          description={errorMessage}
          action={
            <button type="button" onClick={refetch} className={actionClass}>
              Повторить
            </button>
          }
        />
      )}

      {news && <NewsArticle news={news} />}
    </div>
  );
}

const actionClass =
  'rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90';
