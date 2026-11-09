import { Plus } from 'lucide-react';

import { AchievementDialog } from '@features/manage-achievements';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useAchievementsAdmin } from './model/useAchievementsAdmin';
import { achievementColumns } from './ui/achievementColumns';

/**
 * Достижения кафедры в админке: список вместе с черновиками, форма в окне,
 * удаление с подтверждением.
 *
 * Устроен как раздел конференций; отличия живут в форме
 * (`features/manage-achievements`): обязательная обложка и привязка
 * к преподавателю.
 */
export default function AdminAchievementsPage() {
  const {
    achievements,
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
  } = useAchievementsAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Достижения кафедры</h1>

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
          title="Не удалось загрузить достижения"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {/* Новое достижение заводится черновиком (разбор в схеме формы),
          поэтому «появится на сайте» здесь обещать нельзя без оговорки. */}
      {isEmpty && (
        <StatusBlock
          title="Достижений пока нет"
          description="Добавьте первое — на сайте оно появится, когда будет опубликовано."
        />
      )}

      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || achievements.length > 0) && (
        <>
          <DataTable
            columns={achievementColumns({ onEdit: startEdit, onDelete: askDelete })}
            data={achievements}
            getRowId={(achievement) => String(achievement.id)}
            label="Достижения кафедры"
            isLoading={isLoading}
            isSwitching={isSwitching}
            sorting={sorting}
            onSortingChange={onSortingChange}
          />

          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}

      {/* Окна монтируются только на время работы с достижением: начальные
          значения формы берутся при монтировании. */}
      {editing && <AchievementDialog achievement={editing.achievement} onClose={closeEditor} />}

      {deleting && (
        <ConfirmDialog
          title="Удалить достижение?"
          description={`Достижение «${deleting.title}» будет удалено вместе с обложкой, и восстановить его нечем. Чтобы просто убрать его с сайта, снимите в форме флажок «Опубликовать».`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
