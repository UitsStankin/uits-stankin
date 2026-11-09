/**
 * Публичный вход в фичу. Наружу — два окна целиком и хук завершения
 * сессий: у последнего полей нет, а окно подтверждения общее, и держать
 * его открытым решает страница — как с удалением в остальных разделах.
 */
export { ResetPasswordDialog } from './ResetPasswordDialog';
export { UserDialog } from './UserDialog';
export { useTerminateSessions } from './model/useTerminateSessions';
