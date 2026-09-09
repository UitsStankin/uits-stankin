/**
 * Идентификаторы подписи и сообщения об ошибке поля формы.
 *
 * Нужны в двух местах сразу: каркас поля (`shared/ui/FormFields.tsx`)
 * их проставляет, а поля, к которым `<label for>` не цепляется, — на них
 * ссылаются через `aria-labelledby` и `aria-describedby`. Собранные
 * шаблонной строкой по месту, они разъехались бы молча: `aria-describedby`
 * указывал бы на элемент, которого нет, и диктор не прочитал бы ошибку
 * вовсе.
 *
 * Отдельным модулем, а не экспортом из `FormFields.tsx`, — из-за
 * `react-refresh/only-export-components`.
 */
export const labelId = (fieldId: string) => `${fieldId}-label`;

export const errorId = (fieldId: string) => `${fieldId}-error`;
