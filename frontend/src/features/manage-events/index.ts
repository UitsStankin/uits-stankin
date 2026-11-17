/**
 * Публичный вход в фичу: снаружи берут отсюда.
 *
 * Наружу — окно формы целиком и хук удаления, как у конференций:
 * окно подтверждения общее, и держать его открытым решает страница.
 */
export { EventDialog } from './EventDialog';
export { useDeleteEvent } from './model/useDeleteEvent';
