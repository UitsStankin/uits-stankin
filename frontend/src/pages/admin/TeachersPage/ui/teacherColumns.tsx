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
 * Колонки три — как у УВП: ФИО с фотографией, должность с регалиями
 * и действия. Четвёртой была «Имя», и она прожила ровно до первого
 * взгляда на живой стенд: сортировала по `firstName`, а показывала
 * отчество — «Иванова Мария Петровна» и рядом «Имя: Петровна».
 * Заведена она была ради сортировки по имени, но повторять имя третий
 * раз (оно уже в ФИО, и вторым ключом стоит в порядке по умолчанию)
 * незачем, а честной подписи для такой колонки не существует: назови
 * её «Отчество» — соврёт сортировка, оставь «Имя» — соврёт содержимое.
 *
 * Сортируются две — ФИО по фамилии и должность: это поля карточки,
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
      // «ФИО», а не «Фамилия», хотя сортирует колонка по `lastName`:
      // в ячейке стоит имя целиком, и подпись обязана называть то, что
      // в ней лежит. Сортировка по фамилии при этом ровно та, которую
      // ждут от списка сотрудников, — она же стоит по умолчанию.
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
          <span className="font-medium text-text-heading">{teacherFullName(row.original)}</span>
        </div>
      ),
    }),

    column.accessor('position', {
      // «Должность», хотя в ячейке стоят ещё степень и звание: сортирует
      // колонка по `position`, и подпись обязана называть то, по чему
      // сортирует. Степень со званием в базе — коды словаря, порядок
      // по ним вышел бы по строке `CANDIDATE_ECONOM`, а не по смыслу.
      header: 'Должность',
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
