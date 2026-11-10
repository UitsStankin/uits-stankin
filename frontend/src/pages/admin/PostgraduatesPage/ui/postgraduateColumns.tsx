import { Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';

import { adminPostgraduateRoute } from '@shared/config/routes';
import type { Postgraduate } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<Postgraduate>();

/**
 * Колонки таблицы записей аспирантуры.
 *
 * Функция, а не константа: в колонке действий сидит обработчик удаления,
 * и она пересобирается вместе с ним. Чистая при этом — ни состояния,
 * ни запросов, только описание.
 *
 * Колонки — те же, что у таблицы на сайте, кроме темы диссертации: она
 * самая широкая, а в админке рядом нужны действия. Тема при этом ищется
 * поиском — он идёт по всем колонкам публичного списка.
 *
 * «Править» — ссылка, а не кнопка, как у карточек ППС: форма живёт
 * на своём адресе, и открыть её в новой вкладке должно быть можно.
 */
export function postgraduateColumns({ onDelete }: { onDelete: (postgraduate: Postgraduate) => void }) {
  return column.columns([
    column.accessor('studentName', {
      header: 'Аспирант',
      cell: ({ getValue }) => <span className="font-medium text-text-heading">{getValue()}</span>,
    }),

    column.accessor('admissionYear', { header: 'Год поступления' }),

    column.accessor('speciality', {
      header: 'Специальность',
      // Прочерк, а не пустая ячейка: пустую не отличить от недогруженной.
      cell: ({ getValue }) => getValue() ?? '—',
    }),

    column.accessor('teacherName', {
      header: 'Руководитель',
      // Подпись «не назначен» рисует интерфейс, а не контракт: незаполненный
      // руководитель приходит `null` (docs/API.md, «Аспирантура»).
      cell: ({ getValue }) => getValue() ?? <span className="text-text-muted">не назначен</span>,
    }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link
            to={adminPostgraduateRoute(row.original.id)}
            aria-label={`Править запись «${row.original.studentName}»`}
            title={`Править запись «${row.original.studentName}»`}
            className="rounded p-2 text-text-muted transition-colors hover:bg-background-default hover:text-primary"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Link>

          <RowAction
            label={`Удалить запись «${row.original.studentName}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
