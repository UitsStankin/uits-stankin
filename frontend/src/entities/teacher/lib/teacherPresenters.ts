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
