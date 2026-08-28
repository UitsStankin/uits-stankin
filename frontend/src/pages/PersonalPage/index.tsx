import { useAuth } from '@features/auth';
import { ChangePasswordForm, useChangePasswordForm } from '@features/change-password';

import { ProfileCard } from './ui/ProfileCard';
import { describeRoles, formatFullName } from './lib/profileFields';

/**
 * Личный кабинет. Сборка: данные берутся из сессии, разметка — из чистой
 * карточки, страница только соединяет одно с другим.
 *
 * Своего запроса здесь нет. Профиль уже лежит в кэше под ключом
 * `['profile']` — его положил `useAuth` в шапке, и `useQuery` по тому же
 * ключу отдаёт тот же ответ. Отдельная ручка «профиль для страницы»
 * означала бы второй запрос за теми же данными.
 */
export default function PersonalPage() {
  const { profile } = useAuth();
  const passwordForm = useChangePasswordForm();

  // Страница стоит за ProtectedRoute, и без профиля сюда не попасть —
  // тот сам показывает загрузку и уводит на форму входа. Но тип этого
  // не знает: `useAuth` отдаёт `Profile | null`, и ветку надо закрыть.
  if (!profile) return null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Личный кабинет</h1>

      <ProfileCard
        username={profile.username}
        fullName={formatFullName(profile)}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        roles={describeRoles(profile)}
      />

      <ChangePasswordForm
        register={passwordForm.register}
        onSubmit={passwordForm.onSubmit}
        fieldErrors={passwordForm.fieldErrors}
        formError={passwordForm.formError}
        isSuccess={passwordForm.isSuccess}
        isPending={passwordForm.isPending}
        visibleFields={passwordForm.visibleFields}
        onToggleVisibility={passwordForm.onToggleVisibility}
      />
    </div>
  );
}
