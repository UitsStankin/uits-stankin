import { TeacherCard } from '@entities/teacher';
import { cn } from '@shared/lib';
import type { TeacherListItem } from '@shared/types';

interface TeacherGridProps {
  teachers: readonly TeacherListItem[];
  hrefForTeacher: (id: number) => string;
  /** Едет следующая страница: сетка притушена и не кликается. */
  isSwitching?: boolean;
}

/**
 * Сетка карточек ППС. Чистая: получает готовый список и функцию адреса.
 *
 * Сетка, а не список в одну колонку, как у новостей: у карточки
 * преподавателя нет ни обложки в половину ширины, ни анонса на три строки —
 * фото, имя и должность, — и в колонку они растянули бы страницу
 * на два экрана пустоты. Высоту ряда держит `items-stretch` сетки
 * плюс `h-full` карточки: подписи разной длины иначе оставляли бы
 * карточки разной высоты в одном ряду.
 */
export function TeacherGrid({ teachers, hrefForTeacher, isSwitching = false }: TeacherGridProps) {
  return (
    <ul
      className={cn(
        'grid grid-cols-1 gap-gutter-sm transition-opacity sm:grid-cols-2 lg:grid-cols-3',
        // Клики блокируются вместе с притушиванием: без этого можно успеть
        // открыть карточку, которая уже уехала с экрана.
        isSwitching && 'pointer-events-none opacity-50',
      )}
      // Диктору сообщается, что список сейчас обновляется, — иначе он
      // прочитает старые имена как актуальные.
      aria-busy={isSwitching}
    >
      {teachers.map((teacher) => (
        <li key={teacher.id}>
          <TeacherCard teacher={teacher} href={hrefForTeacher(teacher.id)} />
        </li>
      ))}
    </ul>
  );
}
