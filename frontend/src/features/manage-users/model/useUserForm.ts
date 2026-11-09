import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { userKeys } from '@entities/user';
import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { AdminUser } from '@shared/types';

import { createUser, updateUser } from '../api/userAdminApi';
import {
  USER_FIELDS,
  formValuesToCreateRequest,
  formValuesToUpdateRequest,
  userSchema,
  userToFormValues,
  type UserFormValues,
} from './userSchema';

/**
 * Форма учётной записи: проверка полей, запрос, разбор отказа.
 *
 * `user` — правим существующую; `null` — заводим новую. Одна форма
 * на оба случая, хотя тела `POST` и `PUT` расходятся: у создания есть
 * логин и пароль, у правки — блокировка. Общего у них девять десятых —
 * ФИО, почта, роли, — и две формы разошлись бы на первой же правке
 * подписи роли.
 *
 * `currentUserId` — кто вошёл. Себе админ не может ни снять права
 * администратора, ни выставить блокировку (docs/API.md), и форма
 * не предлагает того, что сервер всё равно отвергнет.
 */
export function useUserForm(
  user: AdminUser | null,
  currentUserId: number | null,
  onSaved: () => void,
) {
  const queryClient = useQueryClient();
  const isNew = user === null;
  const isSelf = user !== null && user.id === currentUserId;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema(isNew)),
    defaultValues: userToFormValues(user),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, «нельзя себя». */
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (values: UserFormValues) =>
      user
        ? updateUser(user.id, formValuesToUpdateRequest(values, isSelf))
        : createUser(formValuesToCreateRequest(values)),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        // Весь кэш учёток, а не только список: снятая роль `teacher`
        // и блокировка убирают учётку из справочника формы карточки ППС.
        void queryClient.invalidateQueries({ queryKey: userKeys.all });

        toast.success(
          isNew
            ? `Учётная запись «${saved.username}» создана`
            : `Учётная запись «${saved.username}» сохранена`,
        );
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError)),
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    isNew,
    isSelf,
    isPending: saveMutation.isPending,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по полям, общий
 * баннер не нужен.
 */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<UserFormValues>,
): string | null {
  if (!isApiError(error)) return 'Не удалось сохранить учётную запись. Попробуйте ещё раз.';

  // Словарь — пределы полей и занятый логин (T-80): имена совпадают с формой.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, USER_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * `409` на правке у контракта ровно один: снимают роль `teacher`
   * с учётки, к которой привязана карточка ППС, и `detail` её называет.
   * Словаря у этого отказа нет, но адрес однозначен — и место ему
   * под флажком «Преподаватель», где стоит курсор, а не наверху формы.
   */
  if (error.status === 409) {
    setError('teacher', { type: 'server', message: error.message });

    return null;
  }

  // Остальное — в баннер: `400` «нельзя себя», `404`, сеть, `500`.
  return error.message;
}
