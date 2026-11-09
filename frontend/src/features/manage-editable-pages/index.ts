/**
 * Публичный вход в фичу: снаружи берут отсюда, а не из `model`/`ui`
 * напрямую.
 *
 * Наружу выходят форма и её хук по отдельности, а не окно целиком, как
 * у новостей: форма раздела живёт своей страницей, и собирает её страница
 * (`pages/admin/EditablePageFormPage`) — так же, как карточку ППС.
 * Хука удаления нет: удалять разделы контракт не даёт.
 */
export { EditablePageForm } from './ui/EditablePageForm';
export { useEditablePageForm } from './model/useEditablePageForm';
