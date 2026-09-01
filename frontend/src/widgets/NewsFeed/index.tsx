import { Link } from 'react-router';

import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';

import { FEED_COPY } from './lib/feedCopy';
import { useNewsList } from './model/useNewsList';
import { NewsList } from './ui/NewsList';
import { NewsListSkeleton } from './ui/NewsListSkeleton';
import type { NewsFeedProps } from './NewsFeed.types';

/**
 * Лента записей одного раздела с пагинацией: карточки, шесть состояний
 * и номер страницы в адресе. Сборка: состояние берётся из модели, разметка —
 * из чистых компонентов.
 *
 * Виджет, а не часть страницы новостей, потому что страниц у ленты две —
 * `/about/news` и `/about/announcements` (F-20). Отличаются они разделом
 * и заголовком; всё остальное — пагинация, скелет, пустой список, страница
 * за пределами данных, сбой и обрыв связи — совпадает построчно. Второй
 * копией этих ста строк расходились бы формулировки, а чинилось бы каждое
 * состояние дважды.
 *
 * Заголовка раздела здесь нет: `h1` рисует страница. Виджет вставляется
 * в готовую страницу, и собственный `h1` сделал бы его вторым заголовком
 * первого уровня везде, куда его поставят.
 */
export default function NewsFeed({ postType, route }: NewsFeedProps) {
  const {
    items,
    page,
    totalPages,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    hrefForItem,
  } = useNewsList({ postType, route });

  const copy = FEED_COPY[postType];

  return (
    <>
      {isLoading && <NewsListSkeleton label={copy.loading} />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title={copy.errorTitle}
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && <StatusBlock title={copy.emptyTitle} description={copy.emptyDescription} />}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая лента без объяснения выглядела бы
          так, будто записи кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={
            <Link to={hrefForPage(1)} className={actionClass}>
              К первой странице
            </Link>
          }
        />
      )}

      {items.length > 0 && (
        <>
          <NewsList items={items} hrefForItem={hrefForItem} isSwitching={isSwitching} />
          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}
    </>
  );
}

/** Единственная кнопка ленты: одинаковая у сбоя и у обрыва связи. */
function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={actionClass}>
      Повторить
    </button>
  );
}

const actionClass =
  'rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90';
