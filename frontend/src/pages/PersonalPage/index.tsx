import { CheckCircle2 } from 'lucide-react';

import { useAuth } from '@features/auth';
import { ChangePasswordForm, useChangePasswordForm } from '@features/change-password';
import { TeacherCardForm, useTeacherCardForm } from '@features/edit-teacher-card';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';
import Loader from '@shared/ui/Loader';
import type { Teacher } from '@shared/types';

import { ProfileCard } from './ui/ProfileCard';
import { TeacherCard } from './ui/TeacherCard';
import { describeRoles, formatFullName } from './lib/profileFields';
import { useTeacherCardSection } from './model/useTeacherCardSection';

/**
 * Личный кабинет. Сборка: данные берутся из сессии, разметка — из чистых
 * карточек, страница только соединяет одно с другим.
 *
 * Своего запроса за профилем здесь нет. Он уже лежит в кэше под ключом
 * `['profile']` — его положил `useAuth` в шапке, и `useQuery` по тому же
 * ключу отдаёт тот же ответ. Отдельная ручка «профиль для страницы»
 * означала бы второй запрос за теми же данными.
 *
 * Секция преподавателя (F-16) — только владельцу карточки ППС: флаг
 * `profile.teacher` и включает запрос `GET /api/teachers/me`, и решает,
 * рисовать ли секцию вовсе. Остальные о ней не знают.
 */
export default function PersonalPage() {
  const { profile } = useAuth();
  const passwordForm = useChangePasswordForm();

  // Страница стоит за ProtectedRoute, и без профиля сюда не попасть —
  // тот сам показывает загрузку и уводит на форму входа. Но тип этого
  // не знает: `useAuth` отдаёт `Profile | null`, и ветку надо закрыть.
  //
  // Хук секции стоит выше ветки: правила хуков не позволяют звать его
  // после условного `return`. Флаг `false` держит запрос выключенным.
  const teacherSection = useTeacherCardSection(profile?.teacher ?? false);

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

      {profile.teacher && <TeacherCardSection section={teacherSection} />}

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

/**
 * Секция «Информация о преподавателе»: выбирает, что показать по
 * состоянию запроса, и переключает чтение на форму. Тоже сборка —
 * своей разметки у неё нет, состояние приходит из модели страницы.
 */
function TeacherCardSection({
  section,
}: {
  section: ReturnType<typeof useTeacherCardSection>;
}) {
  if (section.isLoading) {
    return (
      <div className="flex justify-center rounded bg-white p-6 shadow-sm">
        <Loader />
      </div>
    );
  }

  if (section.isOffline) {
    return (
      <StatusBlock
        title="Нет связи с сервером"
        description="Не удалось загрузить карточку преподавателя. Проверьте подключение и повторите попытку."
        action={<RetryButton onClick={section.refetch} />}
      />
    );
  }

  if (section.isError) {
    return (
      <StatusBlock
        tone="danger"
        title="Не удалось загрузить карточку преподавателя"
        description={section.errorMessage}
        action={<RetryButton onClick={section.refetch} />}
      />
    );
  }

  // Роль есть, а карточки нет — контрактный `404`. Не сбой: карточку
  // заводит и привязывает модератор, самому тут сделать нечего.
  if (section.notFound) {
    return (
      <StatusBlock
        title="Карточка преподавателя не привязана"
        description="У вашей учётной записи есть роль преподавателя, но карточка ППС к ней не привязана. Обратитесь к модератору кафедры."
      />
    );
  }

  if (section.card === null) return null;

  if (section.isEditing) {
    return (
      <TeacherCardEditor
        card={section.card}
        onSaved={section.finishEditing}
        onCancel={section.cancelEditing}
      />
    );
  }

  return (
    <>
      {section.justSaved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded bg-success/10 px-3 py-2 text-base text-success"
        >
          <CheckCircle2 size={18} aria-hidden />
          Карточка сохранена.
        </p>
      )}
      <TeacherCard card={section.card} onEdit={section.startEditing} />
    </>
  );
}

/**
 * Обёртка ради правила хуков: `useTeacherCardForm` требует загруженную
 * карточку, а хук нельзя позвать условно. Монтируется на время правки —
 * с размонтированием умирают и начальные значения, и брошенные правки.
 */
function TeacherCardEditor({
  card,
  onSaved,
  onCancel,
}: {
  card: Teacher;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const form = useTeacherCardForm(card, onSaved);

  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <header className="border-b border-default pb-4">
        <h2 className="text-h5 text-text-heading">Информация о преподавателе</h2>
        <p className="mt-1 text-sm text-text-muted">
          Так вас увидят посетители на странице «Преподаватели»
        </p>
      </header>

      <TeacherCardForm
        register={form.register}
        onSubmit={form.onSubmit}
        onCancel={onCancel}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        avatarPreviewUrl={form.avatarPreviewUrl}
        avatarError={form.avatarError}
        isUploadingAvatar={form.isUploadingAvatar}
        onAvatarSelect={form.onAvatarSelect}
      />
    </section>
  );
}
