import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';

import { NewsCard, NewsCardSkeleton } from '@entities/news';
import { NEWS_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import type { News } from '@shared/types';

interface HomeNewsProps {
  items: readonly News[];
  hrefForItem: (id: number) => string;
  isLoading: boolean;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  isEmpty: boolean;
  onRetry: () => void;
}

/**
 * Секция новостей на главной. Чистая: получает разобранные состояния,
 * а не запрос, — решает за неё `model/useHomeContent`.
 *
 * Заголовок — `h2`, а не `h1`: единственный `h1` главной приходит из
 * `home-before`, потому что заголовок страницы — это содержимое, которое
 * правит модератор, а не константа в коде. Пока блок пуст, `h1` на главной
 * нет вовсе; это не украшает страницу и служит ещё одним доводом блок
 * заполнить.
 *
 * Подпись «Новости и объявления», а не «Новости», по той же причине, что
 * и на `/about/news`: фильтра по `postType` у публичной ручки нет, и в одной
 * ленте приходит и то, и другое (D-F7). Обещать в заголовке одно, а
 * показывать другое хуже, чем честно назвать то, что есть.
 *
 * Список — свой `<ul>`, а не `NewsList` из `pages/NewsPage`: страницы FSD
 * друг у друга не заимствуют. Общего у двух лент ровно столько, сколько
 * экспортирует сущность, — карточка; всё прочее у них разное, на главной
 * нет ни пагинации, ни притушивания на время перелистывания.
 */
export function HomeNews({
  items,
  hrefForItem,
  isLoading,
  isOffline,
  isError,
  errorMessage,
  isEmpty,
  onRetry,
}: HomeNewsProps) {
  return (
    <section className="flex flex-col gap-gutter-sm">
      <h2 className="text-h4 text-text-heading">Новости и объявления</h2>

      {isLoading && (
        <div role="status" className="flex animate-pulse flex-col gap-gutter-sm">
          <span className="sr-only">Загрузка новостей</span>

          {/* Три силуэта, хотя записей приедет пять: под редактируемым
              блоком до первого экрана больше и не видно. */}
          {[0, 1, 2].map((index) => (
            <NewsCardSkeleton key={index} />
          ))}
        </div>
      )}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={onRetry} />}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить новости"
          description={errorMessage}
          action={<RetryButton onClick={onRetry} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Новостей пока нет"
          description="Как только на кафедре что-то появится, это будет здесь."
        />
      )}

      {items.length > 0 && (
        <>
          <ul className="flex flex-col gap-gutter-sm">
            {items.map((news) => (
              <li key={news.id}>
                <NewsCard news={news} href={hrefForItem(news.id)} />
              </li>
            ))}
          </ul>

          {/* Ссылка показывается только когда есть что продолжать: уводить
              с главной на заведомо пустую ленту незачем. */}
          <Link
            to={NEWS_ROUTE}
            className="inline-flex w-fit items-center gap-1 self-end text-base text-text-muted transition-colors hover:text-primary"
          >
            Все новости
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
