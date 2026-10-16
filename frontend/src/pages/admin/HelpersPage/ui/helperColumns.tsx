import { Pencil, Trash2 } from 'lucide-react';

import { helperFullName } from '@entities/helper';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import type { Helper } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<Helper>();

/**
 * Колонки таблицы карточек УВП.
 *
 * Функция, а не константа: в колонке действий сидят обработчики, и она
 * пересобирается вместе с ними. Чистая при этом — ни состояния,
 * ни запросов, только описание.
 *
 * Колонок три: ФИО с фотографией, должность и действия. Больше у карточки
 * УВП полей нет — ни степеней, ни званий, ни дисциплин.
 *
 * «Править» — кнопка, а не ссылка, в отличие от раздела ППС: форма живёт
 * окном, и адреса, который можно было бы открыть в новой вкладке,
 * у неё нет.
 */
export function helperColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (helper: Helper) => void;
  onDelete: (helper: Helper) => void;
}) {
  return column.columns([
    column.accessor('lastName', {
      header: 'ФИО',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {/* Фото — декоративное: рядом стоит ФИО, и диктор, прочитав
              его дважды, ничего не добавит. Отсюда пустой `alt`. */}
          <img
            src={row.original.avatarUrl ?? DEFAULT_AVATAR_URL}
            alt=""
            className="size-9 shrink-0 rounded-full object-cover"
          />
          <span className="font-medium text-text-heading">{helperFullName(row.original)}</span>
        </div>
      ),
    }),

    column.accessor('position', { header: 'Должность' }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <RowAction
            label={`Править карточку «${helperFullName(row.original)}»`}
            onClick={() => onEdit(row.original)}
            icon={<Pencil aria-hidden="true" className="size-4" />}
          />

          <RowAction
            label={`Удалить карточку «${helperFullName(row.original)}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
