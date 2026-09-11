import { Pencil, Trash2 } from 'lucide-react';

import { formatDate } from '@shared/lib';
import type { Achievement } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { PublicationStatus } from '@shared/ui/PublicationStatus';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<Achievement>();

/**
 * Колонки таблицы достижений. Функция, а не константа: в колонке действий
 * сидят обработчики. Чистая при этом — только описание.
 *
 * Колонка преподавателя здесь есть, а у новостей колонки автора нет,
 * и это не непоследовательность: автор новости — почти всегда один из двух
 * модераторов, а привязка достижения решает, где оно покажется на сайте, —
 * в карточке преподавателя или только в разделе кафедры.
 */
export function achievementColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (achievement: Achievement) => void;
  onDelete: (achievement: Achievement) => void;
}) {
  return column.columns([
    column.accessor('title', {
      header: 'Название',
      enableSorting: false,
      cell: ({ getValue }) => <span className="font-medium text-text-heading">{getValue()}</span>,
    }),

    /*
     * Имя — то, что собрал сервер (`teacherName`), а не поиск по списку
     * карточек: таблице не нужен второй запрос ради подписи. Кафедральное
     * достижение подписано словом, а не прочерком: прочерк читался бы как
     * «не заполнено», хотя это решение.
     */
    column.accessor('teacherName', {
      header: 'Преподаватель',
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue() ?? <span className="text-text-muted">Кафедральное</span>,
    }),

    column.accessor('display', {
      header: 'Состояние',
      enableSorting: false,
      cell: ({ getValue }) => <PublicationStatus display={getValue()} publishedLabel="Опубликовано" />,
    }),

    column.accessor('createdAt', {
      header: 'Добавлено',
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDate(getValue()) ?? '—'}</span>
      ),
    }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <RowAction
            label={`Править достижение «${row.original.title}»`}
            onClick={() => onEdit(row.original)}
            icon={<Pencil aria-hidden="true" className="size-4" />}
          />

          <RowAction
            label={`Удалить достижение «${row.original.title}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
