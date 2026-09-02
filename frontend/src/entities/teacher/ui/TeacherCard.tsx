import { Link } from 'react-router';

import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { cn } from '@shared/lib';
import type { TeacherListItem } from '@shared/types';

import { teacherCredentials, teacherFullName } from '../lib/teacherPresenters';

interface TeacherCardProps {
  teacher: TeacherListItem;
  /** Адрес карточки. Собирает вызывающий: сущность не знает роутов. */
  href: string;
  className?: string;
}

/**
 * Карточка преподавателя в списке ППС. Чистая: ни состояния, ни запросов —
 * только короткая карточка контракта и адрес.
 *
 * Полная карточка в личном кабинете (`pages/PersonalPage/ui/TeacherCard.tsx`)
 * — другой компонент и другая задача: там свои двенадцать полей с кнопкой
 * правки, здесь пять полей элемента списка.
 *
 * Раскладка вертикальная — фото сверху, подписи под ним, — как в оригинале:
 * список сотрудников читают глазами по фотографиям, и круглый портрет
 * над именем узнаётся быстрее строки текста рядом с миниатюрой.
 */
export function TeacherCard({ teacher, href, className }: TeacherCardProps) {
  const fullName = teacherFullName(teacher);

  return (
    // relative + растянутая ссылка ниже: кликается вся карточка, но ссылка
    // в разметке одна. Обёртка всего в <a> утащила бы в имя ссылки
    // и должность, и степень — диктор читал бы абзац вместо имени.
    <article
      className={cn(
        'relative flex h-full flex-col items-center gap-3 rounded bg-white p-5 text-center',
        'shadow-sm transition-shadow hover:shadow focus-within:shadow',
        className,
      )}
    >
      <img
        src={teacher.avatarUrl ?? DEFAULT_AVATAR_URL}
        // Фото декоративное: имя стоит рядом текстом, и «фото Иванова М. П.»
        // диктор прочитал бы дважды.
        alt=""
        aria-hidden
        // Двадцать карточек — двадцать фотографий; без lazy они уезжают
        // в сеть все разом ещё до первого экрана.
        loading="lazy"
        className="h-28 w-28 shrink-0 rounded-full object-cover"
      />

      <h3 className="text-h5 text-text-heading">
        <Link
          to={href}
          className="after:absolute after:inset-0 hover:text-primary focus-visible:text-primary"
        >
          {fullName}
        </Link>
      </h3>

      <p className="text-base text-text-muted">{teacherCredentials(teacher)}</p>
    </article>
  );
}
