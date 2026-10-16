import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

import { NewsCard, NewsCardSkeleton } from '@entities/news';
import StatusBlock from '@shared/ui/StatusBlock';
import type { PostType } from '@shared/types';

import { HOME_FEED_COPY } from '../lib/homeFeedCopy';
import type { HomeFeedState } from '../model/useHomeContent';

interface HomeFeedProps {
  /** Раздел секции: от него зависят и подписи, и адрес ссылки «ко всем». */
  postType: PostType;
  feed: HomeFeedState;
  hrefForItem: (id: number) => string;
}

/**
 * Секция записей на главной — новости или объявления. Чистая: получает
 * разобранные состояния, а не запрос, — решает за неё `model/useHomeContent`.
 *
 * Одна на обе секции: отличаются они разделом, а вся разметка — заголовок,
 * скелет, четыре состояния и ссылка «ко всем» — у них общая. Подписи берутся
 * из таблицы по `postType`: по-русски «Новостей пока нет» и «Объявлений пока
 * нет» отличаются не подставленным словом, а падежом и родом, шаблоном
 * их не собрать.
 *
 * Заголовок — `h2`, а не `h1`: единственный `h1` главной приходит из
 * `home-before`, потому что заголовок страницы — это содержимое, которое
 * правит модератор, а не константа в коде. Пока блок пуст, `h1` на главной
 * нет вовсе; это не украшает страницу и служит ещё одним доводом блок
 * заполнить.
 *
 * Список — свой `<ul>`, а не `NewsList` из `widgets/NewsFeed`: общего у ленты
 * и витрины ровно столько, сколько экспортирует сущность, — карточка. У главной
 * нет ни пагинации, ни притушивания на время перелистывания, зато есть ссылка
 * «ко всем», которой нет у ленты.
 */
export function HomeFeed({ postType, feed, hrefForItem }: HomeFeedProps) {
  const copy = HOME_FEED_COPY[postType];

  return (
    <section className="flex flex-col gap-gutter-sm">
      <h2 className="text-h4 text-text-heading">{copy.title}</h2>

      {feed.isLoading && (
        <div role="status" className="flex animate-pulse flex-col gap-gutter-sm">
          <span className="sr-only">{copy.loading}</span>

          {/* Три силуэта, хотя записей приедет пять или четыре: под
              редактируемым блоком до первого экрана больше и не видно. */}
          {[0, 1, 2].map((index) => (
            <NewsCardSkeleton key={index} />
          ))}
        </div>
      )}

      {feed.isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={feed.refetch} />}
        />
      )}

      {feed.isError && (
        <StatusBlock
          tone="danger"
          title={copy.errorTitle}
          description={feed.errorMessage}
          action={<RetryButton onClick={feed.refetch} />}
        />
      )}

      {feed.isEmpty && <StatusBlock title={copy.emptyTitle} description={copy.emptyDescription} />}

      {feed.items.length > 0 && (
        <>
          <ul className="flex flex-col gap-gutter-sm">
            {feed.items.map((news) => (
              <li key={news.id}>
                <NewsCard news={news} href={hrefForItem(news.id)} />
              </li>
            ))}
          </ul>

          {/* Ссылка показывается только когда есть что продолжать: уводить
              с главной на заведомо пустой раздел незачем. */}
          <Link
            to={copy.allHref}
            className="inline-flex w-fit items-center gap-1 self-end text-base text-text-muted transition-colors hover:text-primary"
          >
            {copy.allLabel}
            <ChevronRight size={16} aria-hidden />
          </Link>
        </>
      )}
    </section>
  );
}

/** Одинаковая кнопка у сбоя и у обрыва связи — как на ленте. */
function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
    >
      Повторить
    </button>
  );
}
