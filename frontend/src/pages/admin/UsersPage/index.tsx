import { Plus } from 'lucide-react';

import { ResetPasswordDialog, UserDialog } from '@features/manage-users';
import type { UserRole } from '@shared/types';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useUsersAdmin, type ActiveFilter } from './model/useUsersAdmin';
import { FilterLinks } from './ui/FilterLinks';
import { UserSearch } from './ui/UserSearch';
import { userColumns } from './ui/userColumns';

const ROLE_OPTIONS: readonly { value: UserRole | null; label: string }[] = [
  { value: null, label: 'Все роли' },
  { value: 'admin', label: 'Администраторы' },
  { value: 'moderator', label: 'Модераторы' },
  { value: 'teacher', label: 'Преподаватели' },
  { value: 'user', label: 'Без роли' },
];

const ACTIVE_OPTIONS: readonly { value: ActiveFilter | null; label: string }[] = [
  { value: null, label: 'Все' },
  { value: 'true', label: 'Действующие' },
  { value: 'false', label: 'Заблокированные' },
];

/**
 * Учётные записи — единственный раздел админки только для админа
 * (`RoleRoute` с `access="admin"`).
 *
 * Регистрации в портале нет, и это единственное место, где заводят
 * аккаунт. Удаления нет вовсе — его нет в контракте: доступ закрывают
 * блокировкой, флажком «Действует» в форме правки.
 */
export default function UsersPage() {
  const model = useUsersAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Учётные записи</h1>

        <button
          type="button"
          onClick={model.startCreate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Добавить
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <UserSearch
          value={model.searchText}
          onChange={model.onSearchChange}
          onClear={model.onSearchClear}
          foundCount={model.foundCount}
        />

        <FilterLinks
          label="Роль"
          current={model.role}
          options={ROLE_OPTIONS}
          hrefFor={model.hrefForRole}
        />

        <FilterLinks
          label="Состояние"
          current={model.active}
          options={ACTIVE_OPTIONS}
          hrefFor={model.hrefForActive}
        />
      </div>

      {model.isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={model.refetch} />}
        />
      )}

      {model.isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить учётные записи"
          description={model.errorMessage}
          action={<RetryButton onClick={model.refetch} />}
        />
      )}

      {model.isEmpty &&
        (model.isFiltered ? (
          <StatusBlock
            title="Никого не нашлось"
            description="Под этот поиск и отбор не попала ни одна учётная запись."
            action={<ActionLink to={model.resetFiltersHref}>Показать всех</ActionLink>}
          />
        ) : (
          <StatusBlock title="Учётных записей пока нет" />
        ))}

      {model.isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${model.totalPages}.`}
          action={<ActionLink to={model.hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(model.isLoading || model.users.length > 0) && (
        <>
          <DataTable
            columns={userColumns({
              currentUserId: model.currentUserId,
              onEdit: model.startEdit,
              onResetPassword: model.startReset,
              onTerminate: model.askTerminate,
            })}
            data={model.users}
            getRowId={(user) => String(user.id)}
            label="Учётные записи"
            isLoading={model.isLoading}
            isSwitching={model.isSwitching}
            sorting={model.sorting}
            onSortingChange={model.onSortingChange}
          />

          <Pagination
            page={model.page}
            totalPages={model.totalPages}
            buildHref={model.hrefForPage}
          />
        </>
      )}

      {/*
        `key` — по учётке: начальные значения формы берутся при монтировании,
        и смена правимой учётки без пересоздания оставила бы в форме чужие
        флажки. Подложка этого не допускает, но правка, на которой держится
        «кого разжаловали», не должна зависеть от подложки.
      */}
      {model.editing && (
        <UserDialog
          key={model.editing.user?.id ?? 'new'}
          user={model.editing.user}
          currentUserId={model.currentUserId}
          onClose={model.closeEditor}
        />
      )}

      {model.resetting && <ResetPasswordDialog user={model.resetting} onClose={model.closeReset} />}

      {model.terminating && (
        <ConfirmDialog
          title="Завершить сессии?"
          description={
            model.terminating.id === model.currentUserId
              ? 'Это ваша учётная запись: вы выйдете из портала на всех устройствах, включая это.'
              : `Учётная запись «${model.terminating.username}» выйдет из портала на всех устройствах. Пароль останется прежним — войти заново можно сразу.`
          }
          confirmLabel="Завершить"
          onConfirm={model.confirmTerminate}
          onCancel={model.cancelTerminate}
          isPending={model.isTerminating}
        />
      )}
    </div>
  );
}
