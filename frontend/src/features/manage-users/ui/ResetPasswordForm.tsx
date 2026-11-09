import type { FormEventHandler } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { TextField } from '@shared/ui/FormFields';

import type { ResetPasswordFormValues } from '../model/useResetPasswordForm';
import { FormButtons, FormError } from './FormButtons';

interface ResetPasswordFormProps {
  register: UseFormRegister<ResetPasswordFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  fieldErrors: FieldErrors<ResetPasswordFormValues>;
  formError: string | null;
  isPending: boolean;
}

/** Новый пароль чужой учётки. Чистая форма, логика — в `useResetPasswordForm`. */
export function ResetPasswordForm({
  register,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
}: ResetPasswordFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />

      <p className="text-base text-text-default">
        Старый пароль перестанет действовать, а все открытые сессии учётки будут завершены.
      </p>

      <TextField
        id="reset-new-password"
        type="password"
        label="Новый пароль"
        autoComplete="new-password"
        error={fieldErrors.newPassword?.message}
        registration={register('newPassword')}
      />

      <TextField
        id="reset-confirm-password"
        type="password"
        label="Повтор пароля"
        autoComplete="new-password"
        error={fieldErrors.confirmPassword?.message}
        registration={register('confirmPassword')}
      />

      <FormButtons
        submitLabel="Сменить пароль"
        pendingLabel="Меняем…"
        isPending={isPending}
        onCancel={onCancel}
      />
    </form>
  );
}
