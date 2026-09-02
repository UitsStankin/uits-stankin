import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useHelperList } from './model/useHelperList';
import { HelperGrid } from './ui/HelperGrid';
import { HelperGridSkeleton } from './ui/HelperGridSkeleton';

/**
 * Учебно-вспомогательный персонал кафедры: лаборанты, инженеры,
 * методисты. Сборка: состояние берётся из модели, разметка — из чистых
 * компонентов.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/helpers` открыта всем.
 *
 * Детальной страницы у раздела нет — в отличие от ППС. Карточка УВП
 * целиком помещается в элементе списка (docs/API.md, «УВП»), по клику
 * показывать было бы нечего; не было такой страницы и в оригинале.
 */
export default function HelpersPage() {
  const {
    helpers,
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
  } = useHelperList();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Учебно-вспомогательный персонал</h1>

      {isLoading && <HelperGridSkeleton />}

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
          title="Не удалось загрузить список сотрудников"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Сотрудников пока нет"
          description="Карточки появятся здесь, как только их заведут."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая сетка без объяснения выглядела бы
          так, будто сотрудники кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {helpers.length > 0 && (
        <>
          <HelperGrid helpers={helpers} isSwitching={isSwitching} />
          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}
    </div>
  );
}
