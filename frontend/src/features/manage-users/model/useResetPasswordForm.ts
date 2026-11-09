import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { AdminUser } from '@shared/types';

import { resetPassword } from '../api/userAdminApi';
import { confirmPasswordRule, newPasswordRule } from './passwordRules';

const resetPasswordSchema = z
  .object({
    newPassword: newPasswordRule,
    confirmPassword: confirmPasswordRule,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Сброс пароля чужой учётки: новый пароль дважды, старого не спрашивают —
 * админ его не знает.
 *
 * Кэш не трогается: `204` без тела, и в списке учёток от сброса ничего
 * не меняется. Сессии учётки сервер обрывает сам — это сказано
 * в подсказке формы, чтобы сброс не удивил человека, у которого
 * посреди работы вдруг кончился вход.
 */
export function useResetPasswordForm(user: AdminUser, onDone: () => void) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordFormValues) =>
      resetPassword(user.id, { newPassword: values.newPassword }),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    mutation.mutate(values, {
      onSuccess: () => {
        toast.success(`Пароль учётной записи «${user.username}» изменён`);
        onDone();
      },
      onError: (error) => {
        if (!isApiError(error)) {
          setFormError('Не удалось сменить пароль. Попробуйте ещё раз.');
          return;
        }

        // Единственное поле тела — `newPassword`; его отказ встаёт под поле.
        const messages = error.errors?.newPassword;
        if (messages && messages.length > 0) {
          setError('newPassword', { type: 'server', message: messages.join(' ') });
          return;
        }

        setFormError(error.message);
      },
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    isPending: mutation.isPending,
  };
}
