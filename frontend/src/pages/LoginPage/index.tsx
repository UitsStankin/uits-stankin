import { Navigate } from 'react-router';

import { LoginForm, useAuth, useLoginForm } from '@features/auth';

/**
 * Страница входа. Сборка: логика приходит из хука фичи, разметка — из её
 * чистой формы, а страница только соединяет одно с другим и решает,
 * показывать ли форму вообще.
 */
export default function LoginPage() {
  const { isAuthenticated } = useAuth();
  const form = useLoginForm();

  // У обоих сценариев один переход. Если профиль загрузится сразу после
  // входа, его ответ не должен перенаправить со страницы, которую открыли.
  if (isAuthenticated || form.isSuccess) return <Navigate to={form.redirectTo} replace />;

  return (
    <LoginForm
      register={form.register}
      onSubmit={form.onSubmit}
      fieldErrors={form.fieldErrors}
      formError={form.formError}
      isPending={form.isPending}
      isBlocked={form.isBlocked}
      isPasswordVisible={form.isPasswordVisible}
      onTogglePassword={form.onTogglePassword}
    />
  );
}
