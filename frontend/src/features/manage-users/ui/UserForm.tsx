import type { FormEventHandler } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { CheckboxField, TextField } from '@shared/ui/FormFields';

import type { UserFormValues } from '../model/userSchema';
import { FormButtons, FormError } from './FormButtons';

interface UserFormProps {
  register: UseFormRegister<UserFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  fieldErrors: FieldErrors<UserFormValues>;
  formError: string | null;
  isPending: boolean;
  /** Новая учётка: логин и пароль вводятся, блокировки ещё нет. */
  isNew: boolean;
  /** Своя учётка: права администратора и блокировка заперты. */
  isSelf: boolean;
  /** Логин правимой учётки — показывается текстом, поля под него нет. */
  username: string | null;
}

const SELF_HINT = 'Себе снять нельзя: так в системе не кончится действующий администратор.';

/**
 * Форма учётной записи. Чистая: всё приходит пропсами из
 * `model/useUserForm.ts`.
 *
 * Логин при правке — текст, а не запертое поле: он не меняется нигде,
 * и поле ввода обещало бы обратное. `autoComplete="new-password"`
 * у паролей и `off` у логина — чтобы браузер не подставил сюда учётные
 * данные самого админа: ровно это он сделал бы с парой «логин + пароль».
 */
export function UserForm({
  register,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  isNew,
  isSelf,
  username,
}: UserFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormError message={formError} />

      {isNew ? (
        <>
          <TextField
            id="user-username"
            label="Логин"
            autoComplete="off"
            error={fieldErrors.username?.message}
            registration={register('username')}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="user-password"
              type="password"
              label="Пароль"
              autoComplete="new-password"
              error={fieldErrors.password?.message}
              registration={register('password')}
            />

            <TextField
              id="user-confirm-password"
              type="password"
              label="Повтор пароля"
              autoComplete="new-password"
              error={fieldErrors.confirmPassword?.message}
              registration={register('confirmPassword')}
            />
          </div>
        </>
      ) : (
        <p className="text-base text-text-default">
          Логин: <span className="font-bold text-text-heading">{username}</span>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="user-last-name"
          label="Фамилия"
          autoComplete="off"
          error={fieldErrors.lastName?.message}
          registration={register('lastName')}
        />

        <TextField
          id="user-first-name"
          label="Имя"
          autoComplete="off"
          error={fieldErrors.firstName?.message}
          registration={register('firstName')}
        />
      </div>

      <TextField
        id="user-email"
        type="email"
        label="Почта"
        autoComplete="off"
        error={fieldErrors.email?.message}
        registration={register('email')}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-base font-bold text-text-heading">Роли</legend>

        <CheckboxField
          id="user-superuser"
          label="Администратор"
          hint={isSelf ? SELF_HINT : 'Всё, что модератор, плюс учётные записи.'}
          disabled={isSelf}
          error={fieldErrors.superuser?.message}
          registration={register('superuser')}
        />

        <CheckboxField
          id="user-moderator"
          label="Модератор"
          hint="Новости, конференции, карточки ППС, разделы сайта."
          error={fieldErrors.moderator?.message}
          registration={register('moderator')}
        />

        <CheckboxField
          id="user-teacher"
          label="Преподаватель"
          hint="К такой учётке привязывают карточку ППС. Прав в админке не даёт."
          error={fieldErrors.teacher?.message}
          registration={register('teacher')}
        />
      </fieldset>

      {/* У новой учётки блокировки нет: она создаётся действующей. */}
      {!isNew && (
        <CheckboxField
          id="user-active"
          label="Действует"
          hint={
            isSelf
              ? SELF_HINT
              : 'Снятый флажок блокирует учётку: войти нельзя, открытые сессии обрываются сразу.'
          }
          disabled={isSelf}
          error={fieldErrors.active?.message}
          registration={register('active')}
        />
      )}

      <FormButtons
        submitLabel={isNew ? 'Создать' : 'Сохранить'}
        pendingLabel="Сохраняем…"
        isPending={isPending}
        onCancel={onCancel}
      />
    </form>
  );
}
