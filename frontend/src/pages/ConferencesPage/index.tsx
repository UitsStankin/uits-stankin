import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useConferenceList } from './model/useConferenceList';
import { ConferenceList } from './ui/ConferenceList';
import { ConferenceListSkeleton } from './ui/ConferenceListSkeleton';

/**
 * Объявления о конференциях. Сборка: состояние берётся из модели,
 * разметка — из чистых компонентов.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/conferences` открыта всем.
 *
 * Список, а не лента `widgets/NewsFeed`: лента привязана к сущности
 * новостей — её ключам кэша и фильтру `postType`, которого у конференций
 * нет. Виджет выделялся под две страницы одной сущности; здесь страница
 * одна, и её модель — при ней, как у ППС и УВП.
 */
export default function ConferencesPage() {
  const {
    conferences,
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
    hrefForConference,
  } = useConferenceList();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Объявления о конференциях</h1>

      {isLoading && <ConferenceListSkeleton />}

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
          title="Не удалось загрузить объявления о конференциях"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Объявлений о конференциях пока нет"
          description="Как только кафедра объявит о конференции, это будет здесь."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустой список без объяснения выглядел бы
          так, будто объявления кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {conferences.length > 0 && (
        <>
          <ConferenceList
            conferences={conferences}
            hrefForConference={hrefForConference}
            isSwitching={isSwitching}
          />
          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}
    </div>
  );
}
