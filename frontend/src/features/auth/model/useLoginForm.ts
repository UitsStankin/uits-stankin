import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { isApiError } from '@shared/api';
import { applyFieldErrors, pluralize } from '@shared/lib';

import { LOGIN_FIELDS, loginSchema, type LoginFormValues } from './loginSchema';
import { useLogin } from './useLogin';

/**
 * Вся логика формы входа: проверка полей, запрос, разбор отказа, пауза
 * после превышения лимита попыток.
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
  /**
   * Секунды до конца паузы после `429`. `null` — паузы нет.
   *
   * Бэкенд пускает пять попыток в минуту с адреса и в отказе присылает
   * `Retry-After` — обычно около десятка секунд, потому что лимит
   * восстанавливается постепенно, а не разом через минуту.
   */
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Обратный отсчёт. `setTimeout`, а не `setInterval`: каждый тик планирует
  // следующий сам, и остановка — это просто прекращение планирования,
  // без второго состояния «идёт ли отсчёт».
  useEffect(() => {
    if (retryAfter === null) return;

    const timer = setTimeout(() => setRetryAfter(retryAfter > 1 ? retryAfter - 1 : null), 1000);
    return () => clearTimeout(timer);
  }, [retryAfter]);

  const login = useLogin();

  const isBlocked = retryAfter !== null;

  const onSubmit = handleSubmit((values) => {
    // Отправлять во время паузы бессмысленно: ответ будет тот же `429`.
    if (isBlocked) return;

    setFormError(null);
    login.mutate(values, {
      onError: (error) => {
        const pause = retryAfterOf(error);
        setRetryAfter(pause);
        // Во время паузы баннер занят отсчётом. Второй текст под ним
        // не нужен, а пережить паузу он не должен и подавно: «повторите
        // позже» после того, как отсчёт закончился, — прямая неправда.
        setFormError(pause === null ? describeLoginError(error, setError) : null);
      },
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    // Текст паузы важнее прочих: он единственный обновляется каждую секунду,
    // и держать его в состоянии рядом с остальными означало бы дёргать
    // `setFormError` таймером.
    formError: isBlocked
      ? `Слишком много попыток входа. Повторите через ${retryAfter} ${pluralize(retryAfter, ['секунду', 'секунды', 'секунд'])}.`
      : formError,
    /** Запрос в полёте: кнопка блокируется, чтобы не отправить дважды. */
    isPending: login.isPending,
    /** Идёт пауза после превышения лимита попыток. */
    isBlocked,
    isPasswordVisible,
    onTogglePassword: () => setPasswordVisible((visible) => !visible),
  };
}

/**
 * Сколько ждать до следующей попытки. `null` — ждать не нужно.
 *
 * Заголовка может и не оказаться: его видно только потому, что бэкенд
 * добавил `Retry-After` в `Access-Control-Expose-Headers` (D-14). Тогда
 * паузы не будет вовсе, а отказ объяснит обычный текст ошибки — это лучше,
 * чем выдуманная длительность, после которой пользователь получит `429`
 * второй раз.
 */
function retryAfterOf(error: unknown): number | null {
  return isApiError(error) && error.status === 429 ? error.retryAfter : null;
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

  // Остальное: `429` без заголовка, сеть, таймаут, 500. Текст ApiError
  // уже пригоден для показа — внутренняя диагностика 5xx в него не попадает.
  return error.message;
}
