/**
 * Публичный вход в фичу: снаружи берут отсюда, а не из `model`/`ui`
 * напрямую.
 *
 * Наружу выходят форма, её хук и хук удаления — как у карточки ППС,
 * а не окно целиком, как у УВП: форма живёт своей страницей
 * (`pages/admin/PostgraduateFormPage`), и что показывать, пока запись
 * едет, решает страница.
 *
 * Студента как отдельной фичи нет и не будет: своих ручек у него нет,
 * он заводится, правится и удаляется только в составе записи.
 */
export { useDeletePostgraduate } from './model/useDeletePostgraduate';
export { usePostgraduateForm } from './model/usePostgraduateForm';
export { PostgraduateForm } from './ui/PostgraduateForm';
