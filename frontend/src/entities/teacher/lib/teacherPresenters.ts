import { degreeLabel, rankLabel } from '@shared/config/teacherDictionaries';
import type { TeacherDegree, TeacherRank } from '@shared/types';

/**
 * «Фамилия Имя Отчество» из карточки ППС.
 *
 * Родня `formatFullName` профиля, но не она: там ФИО из учётной записи
 * и без отчества, здесь — из самой карточки. Склейка через `filter`,
 * а не шаблонной строкой: `patronymic` в контракте бывает `null`,
 * и шаблон дописал бы к имени « null».
 *
 * Фамилия с именем обязательны контрактом, так что пустой строки
 * не бывает — но функция об этом не знает и не падает: пустое значение
 * останется пустым, а чем его заменить, решает карточка.
 */
export function teacherFullName(teacher: {
  lastName: string;
  firstName: string;
  patronymic: string | null;
}): string {
  return [teacher.lastName, teacher.firstName, teacher.patronymic].filter(Boolean).join(' ');
}

/**
 * «Должность, степень, звание» одной строкой — подпись под ФИО в списке
 * и в шапке карточки.
 *
 * Порядок и запятые повторяют старый портал (`getEmployeePositions`):
 * должность впереди, за ней регалии. Незаполненные выпадают, и строка
 * не начинается с запятой — обязательной из трёх контракт делает только
 * должность, а степени и звания у ассистента нет вовсе.
 *
 * Повтор слова в строке возможен и оставлен как есть: `position` —
 * свободный текст («доцент кафедры»), `rank` — код словаря («доцент»),
 * и у половины ППС выйдет «доцент кафедры, кандидат технических наук,
 * доцент». Так было и в оригинале. Убирать повтор сравнением строк
 * значило бы решать за модератора, что он написал в должности; настоящее
 * лечение — не выдумывать должность из звания, а это уже правка данных.
 */
export function teacherCredentials(teacher: {
  position: string;
  degree: TeacherDegree | null;
  rank: TeacherRank | null;
}): string {
  return [teacher.position, degreeLabel(teacher.degree), rankLabel(teacher.rank)]
    .filter(Boolean)
    .join(', ');
}
