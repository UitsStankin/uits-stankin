import { Pencil } from 'lucide-react';
import { Link } from 'react-router';

import { adminEditablePageRoute } from '@shared/config/routes';
import { formatDateTime } from '@shared/lib';
import type { EditablePage } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';

const column = adminColumns<EditablePage>();

/** Как назвать раздел в ссылке: подписью, а без неё — слагом. */
function sectionName(section: EditablePage): string {
  return section.title ?? section.slug;
}

/**
 * Колонки таблицы разделов. Чистая функция: только описание.
 *
 * Слаг стоит под подписью, а не отдельной колонкой: сам по себе он
 * модератору ничего не говорит, но у перенесённых со старого портала
 * строк подписи бывает нет (`title: null`), и тогда различить разделы
 * можно только по нему.
 *
 * «Пуст» и «Заполнен» — главное, что модератору нужно знать о разделе:
 * на чистой базе пусты все тринадцать, и на сайте каждый из них показан
 * надписью «Раздел пока не заполнен». Считается так же, как на сайте
 * (`widgets/EditableSection`): текст из одних пробелов — тоже пустой.
 */
export function editablePageColumns() {
  return column.columns([
    column.accessor('title', {
      header: 'Раздел',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-col gap-0.5">
          {row.original.title === null ? (
            <span className="text-text-muted">Без подписи</span>
          ) : (
            <span className="font-medium text-text-heading">{row.original.title}</span>
          )}
          <span className="font-mono text-sm text-text-muted">{row.original.slug}</span>
        </span>
      ),
    }),

    column.accessor('text', {
      header: 'Текст',
      enableSorting: false,
      cell: ({ getValue }) =>
        getValue().trim() === '' ? (
          <span className="whitespace-nowrap rounded bg-gray-300 px-2 py-1 text-sm text-text-default">
            Пуст
          </span>
        ) : (
          <span className="whitespace-nowrap rounded bg-success/10 px-2 py-1 text-sm text-success">
            Заполнен
          </span>
        ),
    }),

    column.accessor('updatedAt', {
      header: 'Изменён',
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap">{formatDateTime(getValue()) ?? '—'}</span>
      ),
    }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {/* Ссылка, а не кнопка, — как у карточек ППС: форма живёт своим
              адресом, и открыть её в новой вкладке должно быть можно. */}
          <Link
            to={adminEditablePageRoute(row.original.slug)}
            aria-label={`Править раздел «${sectionName(row.original)}»`}
            title={`Править раздел «${sectionName(row.original)}»`}
            className="rounded p-2 text-text-muted transition-colors hover:bg-background-default hover:text-primary"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ),
    }),
  ]);
}
