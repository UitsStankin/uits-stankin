import { Navigate } from 'react-router';

import { LoginForm, useAuth, useLoginForm } from '@features/auth';
import { HOME_ROUTE } from '@shared/config/routes';

/**
 * Страница входа. Сборка: логика приходит из хука фичи, разметка — из её
 * чистой формы, а страница только соединяет одно с другим и решает,
 * показывать ли форму вообще.
 */
export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const form = useLoginForm();

  // Вошедшему на форме входа делать нечего: он попал сюда по старой ссылке
  // или кнопкой «назад». Второй вход поверх действующей сессии выдал бы
  // новый токен и незаметно осиротил прежний.
  if (isAuthenticated) return <Navigate to={HOME_ROUTE} replace />;

  return (
    <LoginForm
      register={form.register}
      onSubmit={form.onSubmit}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      isPending={form.isPending}
      isPasswordVisible={form.isPasswordVisible}
      onTogglePassword={form.onTogglePassword}
    />
  );
}
