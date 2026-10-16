import { Pencil, Trash2 } from 'lucide-react';

import type { Subject } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<Subject>();

/**
 * Колонки таблицы дисциплин.
 *
 * Функция, а не константа: в колонке действий сидят обработчики, и она
 * пересобирается вместе с ними. Чистая при этом — ни состояния,
 * ни запросов, только описание.
 *
 * Сортировка объявлена только у названия: по нему сортирует контракт,
 * и второй сортируемой колонки у словаря из двух полей быть не может —
 * описание сортировать незачем.
 */
export function subjectColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}) {
  return column.columns([
    column.accessor('name', {
      header: 'Название',
      cell: ({ getValue }) => <span className="font-medium text-text-heading">{getValue()}</span>,
    }),

    column.accessor('description', {
      header: 'Описание',
      enableSorting: false,
      // Незаполненное описание — словами, а не прочерком: у большинства
      // дисциплин словаря его нет вовсе, и колонка из тире выглядела бы
      // так, будто данные не доехали. Диктор к тому же читает тире
      // как «тире» либо молчит.
      cell: ({ getValue }) => {
        const description = getValue();

        return description === null ? (
          <span className="text-text-muted">не заполнено</span>
        ) : (
          <>{description}</>
        );
      },
    }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <RowAction
            label={`Править дисциплину «${row.original.name}»`}
            onClick={() => onEdit(row.original)}
            icon={<Pencil aria-hidden="true" className="size-4" />}
          />

          <RowAction
            label={`Удалить дисциплину «${row.original.name}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
