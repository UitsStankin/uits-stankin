/**
 * Публичный вход в фичу: снаружи берут отсюда, а не из model/ui напрямую.
 *
 * Фича отдельная от `auth`, а не её часть: `auth` отвечает за сессию —
 * кто вошёл, чем подтверждён, как выйти. Смена пароля сессии не касается
 * (D-03: выданный токен продолжает действовать) и живёт в личном кабинете.
 */
export { useChangePasswordForm } from './model/useChangePasswordForm';
export { ChangePasswordForm } from './ui/ChangePasswordForm';
