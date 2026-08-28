import { Link } from 'react-router';

import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';

import { useNewsList } from './model/useNewsList';
import { NewsList } from './ui/NewsList';
import { NewsListSkeleton } from './ui/NewsListSkeleton';

/**
 * Лента новостей кафедры. Сборка: состояние берётся из модели, разметка —
 * из чистых компонентов, страница только соединяет одно с другим.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/news` открыта всем, и лента — то, ради чего на портал
 * заходят без входа.
 *
 * Один список показывает и новости, и объявления: фильтра по `postType`
 * у публичной ручки нет (см. `entities/news/api/newsApi.ts` и D-F7).
 * Поэтому тип каждой записи подписан на карточке, а заголовок страницы —
 * «Новости и объявления», а не «Новости кафедры»: обещать в заголовке
 * одно, а показывать другое хуже, чем честно назвать то, что есть.
 */
export default function NewsPage() {
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
  } = useNewsList();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Новости и объявления</h1>

      {isLoading && <NewsListSkeleton />}

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
          title="Не удалось загрузить новости"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Новостей пока нет"
          description="Как только на кафедре что-то появится, это будет здесь."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая лента без объяснения выглядела бы
          так, будто новости кончились совсем. */}
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
    </div>
  );
}

/** Единственная кнопка страницы: одинаковая у сбоя и у обрыва связи. */
function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={actionClass}>
      Повторить
    </button>
  );
}

const actionClass =
  'rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90';
