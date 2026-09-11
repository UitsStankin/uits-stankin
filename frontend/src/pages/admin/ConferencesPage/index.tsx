import { Plus } from 'lucide-react';

import { ConferenceDialog } from '@features/manage-conferences';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useConferencesAdmin } from './model/useConferencesAdmin';
import { conferenceColumns } from './ui/conferenceColumns';

/**
 * Объявления о конференциях в админке: список вместе с черновиками, форма
 * в окне, удаление с подтверждением.
 *
 * Устроен как раздел новостей (F-43) без фильтра по типу записи: модуль
 * на бэкенде у них один, и CRUD устроен одинаково — модераторская ручка
 * списка со скрытыми, `PUT` полной заменой, физическое удаление.
 *
 * Состояния списка — те же шесть, что у остальных разделов, и считаются
 * так же (`model/useConferencesAdmin.ts`).
 */
export default function AdminConferencesPage() {
  const {
    conferences,
    page,
    totalPages,
    sorting,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    onSortingChange,
    editing,
    startCreate,
    startEdit,
    closeEditor,
    deleting,
    askDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
  } = useConferencesAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Конференции</h1>

        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Добавить
        </button>
      </div>

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
          title="Не удалось загрузить конференции"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Конференций пока нет"
          description="Добавьте первую — она появится на сайте, если оставить её опубликованной."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || conferences.length > 0) && (
        <>
          <DataTable
            columns={conferenceColumns({ onEdit: startEdit, onDelete: askDelete })}
            data={conferences}
            getRowId={(conference) => String(conference.id)}
            label="Конференции"
            isLoading={isLoading}
            isSwitching={isSwitching}
            sorting={sorting}
            onSortingChange={onSortingChange}
          />

          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}

      {/* Окна монтируются только на время работы с объявлением: начальные
          значения формы берутся при монтировании. */}
      {editing && <ConferenceDialog conference={editing.conference} onClose={closeEditor} />}

      {deleting && (
        <ConfirmDialog
          title="Удалить конференцию?"
          description={`Конференция «${deleting.title}» будет удалена вместе с обложкой, и восстановить её нечем. Чтобы просто убрать её с сайта, снимите в форме флажок «Опубликовать».`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
