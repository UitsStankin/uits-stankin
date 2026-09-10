import { Pencil, Trash2 } from 'lucide-react';

import { postTypeLabel } from '@entities/news';
import { formatDate } from '@shared/lib';
import type { News } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<News>();

/**
 * Колонки таблицы новостей и объявлений.
 *
 * Функция, а не константа: в колонке действий сидят обработчики, и она
 * пересобирается вместе с ними. Чистая при этом — ни состояния,
 * ни запросов, только описание.
 *
 * Сортировка объявлена только у даты — разбор в `model/useNewsAdmin.ts`.
 * Колонки «Автор» здесь нет намеренно: в списке кафедры почти всё пишут
 * два человека, и колонка из одного повторяющегося имени съела бы ширину,
 * которой не хватает заголовку. Автор виден в самой записи на сайте.
 */
export function newsColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (news: News) => void;
  onDelete: (news: News) => void;
}) {
  return column.columns([
    column.accessor('title', {
      header: 'Заголовок',
      enableSorting: false,
      cell: ({ getValue }) => <span className="font-medium text-text-heading">{getValue()}</span>,
    }),

    column.accessor('postType', {
      header: 'Тип',
      enableSorting: false,
      cell: ({ getValue }) => postTypeLabel(getValue()),
    }),

    /*
     * Состояние — словами, а не значком: «опубликована» и «черновик» —
     * это то, из-за чего запись видно или не видно на сайте, и угадывать
     * это по цвету точки модератор не должен. Цвет здесь помогает
     * пробежать колонку глазами, но ничего не сообщает сам по себе.
     */
    column.accessor('display', {
      header: 'Состояние',
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue() ? (
          <span className="whitespace-nowrap rounded bg-success/10 px-2 py-1 text-sm text-success">
            Опубликована
          </span>
        ) : (
          <span className="whitespace-nowrap rounded bg-gray-300 px-2 py-1 text-sm text-text-default">
            Черновик
          </span>
        ),
    }),

    column.accessor('createdAt', {
      header: 'Дата',
      // Неразобранная дата — прочерк, а не «Invalid Date»: `formatDate`
      // возвращает `null` и оставляет решение вызывающему.
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
            label={`Править запись «${row.original.title}»`}
            onClick={() => onEdit(row.original)}
            icon={<Pencil aria-hidden="true" className="size-4" />}
          />

          <RowAction
            label={`Удалить запись «${row.original.title}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
