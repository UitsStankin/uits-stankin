/**
 * «Фамилия Имя Отчество» из карточки УВП.
 *
 * Та же склейка, что `teacherFullName` у ППС, и по той же причине через
 * `filter`: `patronymic` в контракте бывает `null`, и шаблонная строка
 * дописала бы к имени « null». Копия, а не общая функция: правило
 * портала — выносить общее, когда копии множатся (кнопку «Повторить»
 * выносили с шести), а у двух строк, живущих каждая при своей сущности,
 * причин разъехаться нет.
 */
export function helperFullName(helper: {
  lastName: string;
  firstName: string;
  patronymic: string | null;
}): string {
  return [helper.lastName, helper.firstName, helper.patronymic].filter(Boolean).join(' ');
}
