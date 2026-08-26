/**
 * Публичный вход в фичу: снаружи берут отсюда, а не из model/ui напрямую.
 * Здесь только то, что кому-то нужно сегодня, — `useLogin` и описание
 * запроса профиля остаются внутренними, их вызывает сама фича.
 */
export { useAuth } from './model/useAuth';
export { useLogout } from './model/useLogout';
export { useLoginForm } from './model/useLoginForm';
export { LoginForm } from './ui/LoginForm';
