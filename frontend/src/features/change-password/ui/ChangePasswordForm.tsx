import type { FormEventHandler } from 'react';
import { CheckCircle2, LoaderCircle } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';

import type { ChangePasswordFormValues } from '../model/changePasswordSchema';
import type { PasswordFieldName } from '../model/useChangePasswordForm';
import { PasswordField } from './PasswordField';

interface ChangePasswordFormProps {
  register: UseFormRegister<ChangePasswordFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<ChangePasswordFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isSuccess: boolean;
  isPending: boolean;
  visibleFields: Record<PasswordFieldName, boolean>;
  onToggleVisibility: (field: PasswordFieldName) => void;
}

/**
 * Форма смены пароля. Чистая: ничего не помнит, ничего не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами
 * из `model/useChangePasswordForm.ts`.
 */
export function ChangePasswordForm({
  register,
  onSubmit,
  fieldErrors,
  formError,
  isSuccess,
  isPending,
  visibleFields,
  onToggleVisibility,
}: ChangePasswordFormProps) {
  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <header className="border-b border-default pb-4">
        <h2 className="text-h5 text-text-heading">Смена пароля</h2>
        <p className="mt-1 text-sm text-text-muted">
          Новый пароль — не короче восьми символов.
        </p>
      </header>

      {/* noValidate: проверяет zod, и сообщения у него русские и одинаковые
          во всех браузерах, в отличие от встроенных подсказок. */}
      <form onSubmit={onSubmit} noValidate className="mt-5 flex max-w-md flex-col gap-5">
        {/* role="alert" — экранный диктор прочитает сообщение сразу, не дожидаясь,
            пока пользователь доберётся до него табом. */}
        {formError && (
          <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
            {formError}
          </p>
        )}

        {/* Только «Пароль изменён»: сказать больше — например, что прежние
            сессии завершены, — было бы неправдой. Выданные токены живут
            свои сутки, отзыва на бэкенде нет (дефект D-03). */}
        {isSuccess && (
          <p
            role="status"
            className="flex items-center gap-2 rounded bg-success/10 px-3 py-2 text-base text-success"
          >
            <CheckCircle2 size={18} aria-hidden />
            Пароль изменён.
          </p>
        )}

        <PasswordField
          id="change-password-old"
          label="Текущий пароль"
          autoComplete="current-password"
          error={fieldErrors.oldPassword?.message}
          isVisible={visibleFields.oldPassword}
          onToggleVisibility={() => onToggleVisibility('oldPassword')}
          registration={register('oldPassword')}
        />

        <PasswordField
          id="change-password-new"
          label="Новый пароль"
          autoComplete="new-password"
          error={fieldErrors.newPassword?.message}
          isVisible={visibleFields.newPassword}
          onToggleVisibility={() => onToggleVisibility('newPassword')}
          registration={register('newPassword')}
        />

        <PasswordField
          id="change-password-confirm"
          label="Новый пароль ещё раз"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword?.message}
          isVisible={visibleFields.confirmPassword}
          onToggleVisibility={() => onToggleVisibility('confirmPassword')}
          registration={register('confirmPassword')}
        />

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'flex items-center justify-center gap-2 self-start rounded bg-primary px-4 py-2.5',
            'text-base font-bold text-white transition',
            'hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isPending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
          {isPending ? 'Сохраняем…' : 'Сменить пароль'}
        </button>
      </form>
    </section>
  );
}
