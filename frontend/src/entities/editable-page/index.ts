/**
 * Публичный вход в сущность «редактируемый раздел»: снаружи берут отсюда,
 * а не из `api` напрямую.
 *
 * Потребителей четыре: главная (F-17), которой нужны два блока из тринадцати,
 * страница раздела (F-23) и — с F-45 — список разделов в админке и форма
 * правки. Форма читает раздел тем же `editablePageQuery`, что и сайт,
 * и слаг из адреса проверяет `parseEditablePageSlug`.
 *
 * `editablePageKeys` вышел наружу с F-45: после `PUT` фиче правки нужно
 * сбросить и раздел на сайте, и список в админке. Голый `fetchEditablePage`
 * по-прежнему внутри: запрос мимо кэша делать некому.
 */
export {
  editablePageKeys,
  editablePageQuery,
  editablePagesListQuery,
} from './api/editablePageQueries';
export { parseEditablePageSlug } from './lib/editablePageSlug';
