import { z } from 'zod';

import type { AdminUser, UserCreateRequest, UserUpdateRequest } from '@shared/types';

import { confirmPasswordRule, newPasswordRule } from './passwordRules';

/**
 * Поля, общие для создания и правки, — с теми же пределами, что
 * у `UserCreateRequestDto` и `UserAdminUpdateRequestDto`.
 *
 * Почта по формату не проверяется, как и у конференций: серверный `@Email`
 * мягче любой клиентской проверки, и строгая схема запретила бы то,
 * что сервер сохранит. Отказ по формату приходит словарём и встаёт
 * под поле сам.
 *
 * Необязательные строки — строки, а не `string | null`: `''` означает
 * «не заполнено» и превращается в `null` на границе запроса.
 */
const commonFields = {
  email: z.string().trim().max(254, 'Адрес почты не длиннее 254 символов'),
  firstName: z.string().trim().max(150, 'Имя не длиннее 150 символов'),
  lastName: z.string().trim().max(150, 'Фамилия не длиннее 150 символов'),
  superuser: z.boolean(),
  moderator: z.boolean(),
  teacher: z.boolean(),
  active: z.boolean(),
};

/**
 * Создание: логин и пароль обязательны, `active` в теле нет — учётка
 * заводится действующей. Поле в форме при этом есть (скрытое значение
 * `true`), чтобы у обеих схем был один тип значений.
 */
const createSchema = z
  .object({
    ...commonFields,
    username: z.string().trim().min(1, 'Укажите логин').max(150, 'Логин не длиннее 150 символов'),
    password: newPasswordRule,
    confirmPassword: confirmPasswordRule,
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

/**
 * Правка: логин не меняется нигде, пароль — своей ручкой. Поля остаются
 * в значениях формы пустыми и в запрос не уходят.
 */
const editSchema = z.object({
  ...commonFields,
  username: z.string(),
  password: z.string(),
  confirmPassword: z.string(),
});

export function userSchema(isNew: boolean) {
  return isNew ? createSchema : editSchema;
}

export type UserFormValues = z.infer<typeof editSchema>;

/**
 * Поля, под которые форма умеет положить отказ сервера. Занятый логин
 * приходит словарём под `username` (T-80), нарушения пределов — под
 * именами полей DTO, а они совпадают с именами формы.
 */
export const USER_FIELDS = [
  'username',
  'password',
  'email',
  'firstName',
  'lastName',
  'superuser',
  'moderator',
  'teacher',
  'active',
] as const;

/**
 * Начальные значения: правка существующей учётки или новая (`null`).
 *
 * Новая — без единой роли. Роль даёт права, и выставленная по умолчанию
 * означала бы права, которые никто не выдавал осознанно.
 */
export function userToFormValues(user: AdminUser | null): UserFormValues {
  return {
    username: user?.username ?? '',
    password: '',
    confirmPassword: '',
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    superuser: user?.superuser ?? false,
    moderator: user?.moderator ?? false,
    teacher: user?.teacher ?? false,
    active: user?.active ?? true,
  };
}

export function formValuesToCreateRequest(values: UserFormValues): UserCreateRequest {
  return {
    username: values.username,
    password: values.password,
    email: emptyToNull(values.email),
    firstName: emptyToNull(values.firstName),
    lastName: emptyToNull(values.lastName),
    superuser: values.superuser,
    moderator: values.moderator,
    teacher: values.teacher,
  };
}

/**
 * Тело правки. `isSelf` — админ правит собственную учётку: снять с себя
 * `superuser` и заблокировать себя сервер не даст (`400`), и форма эти
 * два флажка запирает. Значения здесь выставляются явно, а не берутся
 * из формы: у запертого флажка браузер может не отдать значение,
 * и `PUT` без обязательного флага получил бы `400` на ровном месте.
 */
export function formValuesToUpdateRequest(
  values: UserFormValues,
  isSelf: boolean,
): UserUpdateRequest {
  return {
    email: emptyToNull(values.email),
    firstName: emptyToNull(values.firstName),
    lastName: emptyToNull(values.lastName),
    superuser: isSelf ? true : values.superuser,
    moderator: values.moderator,
    teacher: values.teacher,
    active: isSelf ? true : values.active,
  };
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
