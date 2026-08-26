import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';

import { changePassword } from '../api/changePasswordApi';
import {
  CHANGE_PASSWORD_FIELDS,
  changePasswordSchema,
  type ChangePasswordFormValues,
} from './changePasswordSchema';

/** Поля, у которых есть кнопка «показать». */
export type PasswordFieldName = keyof ChangePasswordFormValues;

/**
 * Вся логика формы смены пароля: проверка полей, запрос, разбор отказа.
 *
 * Мутация объявлена прямо здесь, без отдельного `useChangePassword` —
 * в отличие от входа, где `useLogin` кроме запроса кладёт токен
 * и переводит на страницу. Здесь после ответа не происходит ничего,
 * кроме показа сообщения, и промежуточный хук был бы обёрткой ради обёртки.
 *
 * Кэш не трогается намеренно: профиль от смены пароля не меняется,
 * инвалидировать `['profile']` не за чем.
 */
export function useChangePasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  /** Ошибка, которая не легла ни на одно поле: сбой сети, 500, отказ прав. */
  const [formError, setFormError] = useState<string | null>(null);
  const [visibleFields, setVisibleFields] = useState<Record<PasswordFieldName, boolean>>({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const mutation = useMutation({ mutationFn: changePassword });

  const onSubmit = handleSubmit(
    // `confirmPassword` отрезается здесь, в деструктуризации: бэкенд о нём
    // не знает, а лишнее поле в теле запроса — это вопрос «а вдруг оно
    // что-то значит» на первом же чтении сетевой вкладки.
    ({ oldPassword, newPassword }) => {
      setFormError(null);
      mutation.mutate(
        { oldPassword, newPassword },
        {
          // Введённые пароли стираются сразу после успеха: держать их
          // в полях дальше незачем, а форма остаётся на странице.
          onSuccess: () => reset(),
          onError: (error) => setFormError(describeChangePasswordError(error, setError)),
        },
      );
    },
    // Форму снова заполняют — значит, сообщение об успехе относится
    // к прошлому разу. Без сброса «Пароль изменён» висело бы рядом
    // с ошибками полей.
    () => mutation.reset(),
  );

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    /** Показывать ли сообщение об успешной смене. */
    isSuccess: mutation.isSuccess,
    /** Запрос в полёте: кнопка блокируется, чтобы не отправить дважды. */
    isPending: mutation.isPending,
    visibleFields,
    onToggleVisibility: (field: PasswordFieldName) =>
      setVisibleFields((visible) => ({ ...visible, [field]: !visible[field] })),
  };
}

/**
 * Что показать пользователю после отказа. Возвращает `null`, если всё
 * уже разложено по полям и общий баннер не нужен.
 */
function describeChangePasswordError(
  error: unknown,
  setError: UseFormSetError<ChangePasswordFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё,
  // включая обрыв сети. Ветка на случай, если однажды перестанет.
  if (!isApiError(error)) return 'Не удалось сменить пароль. Попробуйте ещё раз.';

  // Словарь приходит от валидации `@Valid`, и имена в нём совпадают
  // с именами полей формы — те же `oldPassword` и `newPassword`.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, CHANGE_PASSWORD_FIELDS, setError);
    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // 400 без словаря — это неверный текущий пароль.
  //
  // docs/API.md обещает «показать ошибки у полей», но словаря в этом ответе
  // нет: на бэкенде ошибка приходит не из валидации, а из сервиса
  // (`InvalidOldPasswordException` → ProblemDetail с одним `detail`).
  // Значит поле выбирает клиент — другого кандидата, кроме текущего пароля,
  // на этой ручке всё равно нет: длину нового проверяет валидация,
  // и она отвечает словарём.
  if (error.status === 400) {
    setError('oldPassword', { type: 'server', message: error.message });
    return null;
  }

  // 401 сюда тоже доедет, но показывать его некому: интерцептор уже стёр
  // токен и уводит на форму входа. Остальное — 403, сеть, таймаут, 500:
  // текст ApiError пригоден для показа, внутренняя диагностика 5xx
  // в него не попадает.
  return error.message;
}
