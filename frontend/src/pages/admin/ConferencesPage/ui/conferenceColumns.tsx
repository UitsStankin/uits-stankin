import { Pencil, Trash2 } from 'lucide-react';

import { conferenceDatesLabel } from '@entities/conference';
import { formatDate } from '@shared/lib';
import type { Conference } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { PublicationStatus } from '@shared/ui/PublicationStatus';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<Conference>();

/**
 * Колонки таблицы конференций. Функция, а не константа: в колонке действий
 * сидят обработчики. Чистая при этом — только описание.
 *
 * Две даты рядом, и подписаны они по-разному намеренно: «Даты проведения» —
 * когда конференция, «Добавлена» — когда о ней написали. Сортируется только
 * вторая, разбор в `model/useConferencesAdmin.ts`. «Дата», как у новостей,
 * здесь была бы неправдой наполовину: читающий таблицу первым делом
 * подумал бы о дне конференции.
 */
export function conferenceColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (conference: Conference) => void;
  onDelete: (conference: Conference) => void;
}) {
  return column.columns([
    column.accessor('title', {
      header: 'Название',
      enableSorting: false,
      cell: ({ getValue }) => <span className="font-medium text-text-heading">{getValue()}</span>,
    }),

    /*
     * Та же подпись, что на сайте (`conferenceDatesLabel`): «14–16 октября
     * 2026 г.» у модератора и у посетителя. Прочерк — заготовка без дат,
     * а не сбой: даты у объявления необязательны.
     */
    column.display({
      id: 'dates',
      header: 'Даты проведения',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {conferenceDatesLabel(row.original.startDate, row.original.endDate) ?? '—'}
        </span>
      ),
    }),

    column.accessor('display', {
      header: 'Состояние',
      enableSorting: false,
      cell: ({ getValue }) => <PublicationStatus display={getValue()} publishedLabel="Опубликована" />,
    }),

    column.accessor('createdAt', {
      header: 'Добавлена',
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
            label={`Править конференцию «${row.original.title}»`}
            onClick={() => onEdit(row.original)}
            icon={<Pencil aria-hidden="true" className="size-4" />}
          />

          <RowAction
            label={`Удалить конференцию «${row.original.title}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
