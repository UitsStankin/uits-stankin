import type { FormEventHandler } from 'react';
import { Link } from 'react-router';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';
import { HOME_ROUTE } from '@shared/config/routes';
import type { LoginFormValues } from '../model/loginSchema';

interface LoginFormProps {
  register: UseFormRegister<LoginFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<LoginFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  /** Пауза после превышения лимита попыток: отправлять нечего смысла. */
  isBlocked: boolean;
  isPasswordVisible: boolean;
  onTogglePassword: () => void;
}

const inputClass = cn(
  'w-full rounded border border-gray-300 bg-white px-3 py-2',
  'text-base text-text-default placeholder:text-text-muted',
  'transition-colors focus:border-primary focus:ring-0',
  'aria-invalid:border-danger'
);

/**
 * Форма входа. Чистая: ничего не помнит, ничего не запрашивает и не решает,
 * что считать ошибкой, — всё приходит пропсами из `model/useLoginForm.ts`.
 */
export function LoginForm({
  register,
  onSubmit,
  fieldErrors,
  formError,
  isPending,
  isBlocked,
  isPasswordVisible,
  onTogglePassword,
}: LoginFormProps) {
  return (
    // noValidate: проверяет zod, и сообщения у него русские и одинаковые
    // во всех браузерах, в отличие от встроенных подсказок.
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-h4 text-text-heading">Вход для персонала</h1>
        <p className="mt-1 text-sm text-text-muted">
          Учётные записи заводит администратор кафедры.
        </p>
      </div>

      {formError && (
        // role="alert" — экранный диктор прочитает сообщение сразу, не дожидаясь,
        // пока пользователь доберётся до него табом.
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-username" className="text-base font-bold text-text-heading">
          Логин
        </label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          // Единственное поле ввода на странице, и пришли сюда ради него.
          autoFocus
          aria-invalid={fieldErrors.username !== undefined}
          aria-describedby={fieldErrors.username && 'login-username-error'}
          className={inputClass}
          {...register('username')}
        />
        {fieldErrors.username && (
          <p id="login-username-error" className="text-sm text-danger">
            {fieldErrors.username.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-base font-bold text-text-heading">
          Пароль
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={isPasswordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            aria-invalid={fieldErrors.password !== undefined}
            aria-describedby={fieldErrors.password && 'login-password-error'}
            className={cn(inputClass, 'pr-10')}
            {...register('password')}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            // Кнопка внутри формы: без type="button" она отправляла бы форму.
            aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={isPasswordVisible}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted transition-colors hover:text-primary"
          >
            {isPasswordVisible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="login-password-error" className="text-sm text-danger">
            {fieldErrors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending || isBlocked}
        className={cn(
          'flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5',
          'text-base font-bold text-white transition',
          'hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60'
        )}
      >
        {isPending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
        {isPending ? 'Входим…' : 'Войти'}
      </button>

      <Link
        to={HOME_ROUTE}
        className="text-center text-sm text-text-muted transition-colors hover:text-primary"
      >
        Вернуться на сайт кафедры
      </Link>
    </form>
  );
}
