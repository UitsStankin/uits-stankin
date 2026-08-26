import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';

import { LOGIN_FIELDS, loginSchema, type LoginFormValues } from './loginSchema';
import { useLogin } from './useLogin';

/**
 * Вся логика формы входа: проверка полей, запрос, разбор отказа.
 *
 * Форма (`ui/LoginForm.tsx`) получает готовое пропсами и не решает ничего —
 * ни что считать ошибкой, ни когда блокировать кнопку.
 */
export function useLoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // Пустые строки, а не undefined: без них поле считается неуправляемым,
    // и React ругается на переход с неуправляемого на управляемое.
    defaultValues: { username: '', password: '' },
  });

  /** Ошибка, которая не легла ни на одно поле: неверная пара, сбой сети, 500. */
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const login = useLogin();

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    login.mutate(values, {
      onError: (error) => setFormError(describeLoginError(error, setError)),
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    /** Запрос в полёте: кнопка блокируется, чтобы не отправить дважды. */
    isPending: login.isPending,
    isPasswordVisible,
    onTogglePassword: () => setPasswordVisible((visible) => !visible),
  };
}

/**
 * Что показать пользователю после отказа. Возвращает `null`, если всё
 * уже разложено по полям и общий баннер не нужен.
 */
function describeLoginError(
  error: unknown,
  setError: UseFormSetError<LoginFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё,
  // включая обрыв сети. Ветка на случай, если однажды перестанет.
  if (!isApiError(error)) return 'Не удалось войти. Попробуйте ещё раз.';

  // 401 на самом входе — это неверная пара, а не протухшая сессия.
  // Контракт отвечает одинаково на несуществующий логин и на неверный
  // пароль, чтобы не раскрывать список учёток, — сообщение тоже общее.
  // Текст свой, а не `error.message`: у ApiError на случай пустого `detail`
  // заготовлено «Требуется вход в систему», на форме входа это бессмыслица.
  if (error.status === 401) return 'Неверный логин или пароль.';

  // 400 со словарём: оба поля на бэкенде помечены @NotBlank. Сюда почти
  // не попасть — zod не даст отправить пустое, — но контракт эту ошибку
  // обещает, и молчаливая форма вместо неё была бы хуже.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, LOGIN_FIELDS, setError);
    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // Остальное: сеть, таймаут, 500. Текст ApiError уже пригоден для показа —
  // внутренняя диагностика 5xx в него не попадает.
  return error.message;
}
