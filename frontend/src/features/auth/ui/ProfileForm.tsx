import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';
import { AvatarPicker } from '@shared/ui/AvatarPicker';
import { TextField } from '@shared/ui/FormFields';

import type { ProfileFormValues } from '../model/profileSchema';

interface ProfileFormProps {
  register: UseFormRegister<ProfileFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<ProfileFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  avatarPreviewUrl: string | null;
  avatarError: string | null;
  isUploadingAvatar: boolean;
  onAvatarSelect: (file: File) => void;
  onAvatarRemove: () => void;
  /** Логин и почта — показываются, но не правятся. */
  username: string;
  email: string | null;
}

/**
 * Форма правки профиля. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами
 * из `model/useProfileForm.ts`.
 *
 * Полей всего три, и это весь `PUT /api/users/profile`: имя, фамилия
 * и аватар. Больше контракт из личного кабинета менять не даёт.
 */
export function ProfileForm({
  register,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  avatarPreviewUrl,
  avatarError,
  isUploadingAvatar,
  onAvatarSelect,
  onAvatarRemove,
  username,
  email,
}: ProfileFormProps) {
  return (
    // noValidate: проверяет zod, и сообщения у него русские и одинаковые
    // во всех браузерах, в отличие от встроенных подсказок.
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
      {/* role="alert" — диктор прочитает сообщение сразу, не дожидаясь,
          пока пользователь доберётся до него табом. */}
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <AvatarPicker
        previewUrl={avatarPreviewUrl}
        isUploading={isUploadingAvatar}
        error={avatarError}
        onSelect={onAvatarSelect}
        onRemove={onAvatarRemove}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="profile-last-name"
          label="Фамилия"
          autoComplete="family-name"
          error={fieldErrors.lastName?.message}
          registration={register('lastName')}
        />
        <TextField
          id="profile-first-name"
          label="Имя"
          autoComplete="given-name"
          error={fieldErrors.firstName?.message}
          registration={register('firstName')}
        />
      </div>

      {/* Логин и почта показаны, но не полями ввода. Поле, которое можно
          заполнить, а сервер молча проигнорирует, — хуже отсутствующего:
          пользователь уйдёт со страницы уверенным, что почту сменил.
          А совсем убрать их из формы значило бы, что при переходе к правке
          они исчезают со страницы без объяснений. */}
      <div className="flex flex-col gap-4 rounded bg-secondary/40 p-4 sm:flex-row sm:gap-8">
        <ReadOnlyField label="Имя пользователя" value={username} />
        <ReadOnlyField label="Электронная почта" value={email} />
      </div>
      <p className="-mt-3 text-sm text-text-muted">
        Логин и почту в личном кабинете изменить нельзя — с этим к администратору.
      </p>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5',
            'text-base font-bold text-white transition',
            'hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isPending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={cn(
            'rounded border border-default px-4 py-2.5 text-base font-bold text-text-heading',
            'transition hover:border-primary hover:text-primary',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

/**
 * Значение, которое форма показывает, но не правит.
 *
 * Не `<input disabled>`: заблокированное поле выпадает из обхода табом,
 * и диктор его пропускает — то есть «почта у вас такая» до незрячего
 * пользователя не доходит вовсе. Пара «подпись — значение» доходит.
 */
function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={cn('break-words text-base', value ? 'text-text-heading' : 'text-text-muted')}>
        {value || '—'}
      </span>
    </div>
  );
}
