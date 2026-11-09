import { KeyRound, LogOut, Pencil } from 'lucide-react';

import { formatDate, formatDateTime } from '@shared/lib';
import type { AdminUser } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<AdminUser>();

/** Роли словами, в порядке убывания прав. Без ролей — «пользователь». */
function roleLabels(user: AdminUser): string[] {
  const labels = [
    user.superuser && 'Администратор',
    user.moderator && 'Модератор',
    user.teacher && 'Преподаватель',
  ].filter((label): label is string => typeof label === 'string');

  return labels.length > 0 ? labels : ['Пользователь'];
}

function fullName(user: AdminUser): string | null {
  const name = [user.lastName, user.firstName].filter(Boolean).join(' ');

  return name === '' ? null : name;
}

/**
 * Колонки таблицы учёток. Функция, а не константа: в колонке действий
 * обработчики. Чистая — только описание.
 *
 * Кнопки удаления нет и не будет: контракт её не предусматривает,
 * доступ закрывают блокировкой в форме правки (docs/API.md).
 */
export function userColumns({
  currentUserId,
  onEdit,
  onResetPassword,
  onTerminate,
}: {
  currentUserId: number | null;
  onEdit: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onTerminate: (user: AdminUser) => void;
}) {
  return column.columns([
    column.accessor('username', {
      header: 'Учётная запись',
      cell: ({ row }) => {
        const user = row.original;
        const name = fullName(user);

        return (
          <div className="flex flex-col">
            <span className="font-medium text-text-heading">
              {user.username}
              {user.id === currentUserId && (
                <span className="font-normal text-text-muted"> (вы)</span>
              )}
            </span>
            <span className="text-sm text-text-muted">{name ?? 'ФИО не заполнено'}</span>
          </div>
        );
      },
    }),

    column.accessor('email', {
      header: 'Почта',
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue() ?? <span className="text-text-muted">не заполнена</span>,
    }),

    column.display({
      id: 'roles',
      header: 'Роли',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{roleLabels(row.original).join(', ')}</span>
      ),
    }),

    column.accessor('active', {
      header: 'Состояние',
      enableSorting: false,
      // Словами, а не цветом: заблокирована учётка или нет — то, ради чего
      // в этот раздел приходят.
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="whitespace-nowrap rounded bg-success/10 px-2 py-1 text-sm text-success">
            Действует
          </span>
        ) : (
          <span className="whitespace-nowrap rounded bg-danger/10 px-2 py-1 text-sm text-danger">
            Заблокирована
          </span>
        ),
    }),

    column.accessor('lastLogin', {
      header: 'Последний вход',
      enableSorting: false,
      cell: ({ getValue }) => {
        const value = getValue();

        return (
          <span className="whitespace-nowrap">
            {value === null ? 'ни разу' : (formatDateTime(value) ?? '—')}
          </span>
        );
      },
    }),

    column.accessor('dateJoined', {
      header: 'Заведена',
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue()) ?? '—'}</span>
      ),
    }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => {
        const { username } = row.original;

        return (
          <div className="flex justify-end gap-1">
            <RowAction
              label={`Править учётную запись «${username}»`}
              onClick={() => onEdit(row.original)}
              icon={<Pencil aria-hidden="true" className="size-4" />}
            />

            <RowAction
              label={`Сменить пароль учётной записи «${username}»`}
              onClick={() => onResetPassword(row.original)}
              icon={<KeyRound aria-hidden="true" className="size-4" />}
            />

            <RowAction
              label={`Завершить сессии учётной записи «${username}»`}
              onClick={() => onTerminate(row.original)}
              tone="danger"
              icon={<LogOut aria-hidden="true" className="size-4" />}
            />
          </div>
        );
      },
    }),
  ]);
}
