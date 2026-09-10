import { Link } from 'react-router';
import { Pencil, Trash2 } from 'lucide-react';

import { teacherCredentials, teacherFullName } from '@entities/teacher';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { adminTeacherRoute } from '@shared/config/routes';
import type { TeacherListItem } from '@shared/types';
import { adminColumns } from '@shared/ui/DataTable/model/adminTable';
import { RowAction } from '@shared/ui/RowAction';

const column = adminColumns<TeacherListItem>();

/**
 * Колонки таблицы карточек ППС.
 *
 * Функция, а не константа: в колонке действий сидит обработчик удаления,
 * и она пересобирается вместе с ним. Чистая при этом — ни состояния,
 * ни запросов, только описание.
 *
 * Сортируются три колонки — фамилия, имя и должность: это поля карточки,
 * и `sort` принимает именно их. Степень и звание не сортируются: в базе
 * это коды словаря, и порядок вышел бы по строке `CANDIDATE_ECONOM`,
 * а не по смыслу подписи.
 *
 * «Править» — **ссылка**, а не кнопка: форма живёт своим адресом,
 * и ссылку можно открыть в новой вкладке или переслать. Кнопка,
 * зовущая `navigate`, отняла бы и то и другое, ничего не дав взамен.
 */
export function teacherColumns({ onDelete }: { onDelete: (teacher: TeacherListItem) => void }) {
  return column.columns([
    column.accessor('lastName', {
      header: 'Фамилия',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {/* Фото — декоративное: рядом стоит ФИО, и диктор, прочитав
              его дважды, ничего не добавит. Отсюда пустой `alt`. */}
          <img
            src={row.original.avatarUrl ?? DEFAULT_AVATAR_URL}
            alt=""
            className="size-9 shrink-0 rounded-full object-cover"
          />
          <span className="font-medium text-text-heading">{teacherFullName(row.original)}</span>
        </div>
      ),
    }),

    column.accessor('firstName', {
      header: 'Имя',
      // Колонка нужна ради сортировки, а не ради показа: имя уже стоит
      // в ФИО слева. Рисовать его вторым столбцом значило бы занять
      // ширину повтором — поэтому здесь отчество, которого в подписи
      // под ФИО нет и которое модератор как раз проверяет глазами.
      cell: ({ row }) =>
        row.original.patronymic === null ? (
          <span className="text-text-muted">без отчества</span>
        ) : (
          <>{row.original.patronymic}</>
        ),
    }),

    column.accessor('position', {
      header: 'Должность и регалии',
      // Должность, степень и звание одной строкой — тем же способом,
      // что и на публичной странице: три колонки под них съели бы
      // ширину, а читаются они всё равно вместе.
      cell: ({ row }) => <>{teacherCredentials(row.original)}</>,
    }),

    column.display({
      id: 'actions',
      header: 'Действия',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Link
            to={adminTeacherRoute(row.original.id)}
            aria-label={`Править карточку «${teacherFullName(row.original)}»`}
            title={`Править карточку «${teacherFullName(row.original)}»`}
            className="rounded p-2 text-text-muted transition-colors hover:bg-background-default hover:text-primary"
          >
            <Pencil aria-hidden="true" className="size-4" />
          </Link>

          <RowAction
            label={`Удалить карточку «${teacherFullName(row.original)}»`}
            onClick={() => onDelete(row.original)}
            tone="danger"
            icon={<Trash2 aria-hidden="true" className="size-4" />}
          />
        </div>
      ),
    }),
  ]);
}
