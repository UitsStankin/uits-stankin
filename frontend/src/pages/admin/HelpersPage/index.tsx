import { Plus } from 'lucide-react';

import { HelperDialog } from '@features/manage-helpers';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useHelpersAdmin } from './model/useHelpersAdmin';
import { helperColumns } from './ui/helperColumns';

/**
 * Учебно-вспомогательный персонал в админке: список, форма в окне,
 * удаление с подтверждением.
 *
 * Устроен как раздел дисциплин, а не как соседний раздел ППС: карточка
 * УВП целиком лежит в строке списка — вместе с ключом фото, — поэтому
 * форме нечего догружать и своего адреса у неё нет.
 *
 * Состояния списка — те же шесть, что у публичных разделов, и считаются
 * так же (`model/useHelpersAdmin.ts`).
 */
export default function HelpersPage() {
  const {
    helpers,
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
  } = useHelpersAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Учебно-вспомогательный персонал</h1>

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
          title="Не удалось загрузить сотрудников"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Карточек пока нет"
          description="Заведите первую — она появится в разделе «УВП» на сайте."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая таблица без объяснения выглядела бы
          так, будто карточки кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || helpers.length > 0) && (
        <>
          <DataTable
            columns={helperColumns({ onEdit: startEdit, onDelete: askDelete })}
            data={helpers}
            getRowId={(helper) => String(helper.id)}
            label="Учебно-вспомогательный персонал"
            isLoading={isLoading}
            isSwitching={isSwitching}
            sorting={sorting}
            onSortingChange={onSortingChange}
          />

          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}

      {/*
        Окна монтируются только на время работы с карточкой — и это
        не экономия рендера: начальные значения формы берутся при
        монтировании, поэтому «правим другую карточку» и «форма
        показывает её поля» — одно и то же событие.
      */}
      {editing && <HelperDialog helper={editing.helper} onClose={closeEditor} />}

      {deleting && (
        <ConfirmDialog
          title="Удалить карточку сотрудника?"
          description={`Карточка «${deleting.lastName} ${deleting.firstName}» исчезнет с сайта вместе с фотографией. Отменить это будет нельзя.`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
