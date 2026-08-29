import { z } from 'zod';

import { DEGREE_CODES, RANK_CODES } from '@shared/config/teacherDictionaries';
import type { Teacher, TeacherUpsertRequest } from '@shared/types';

/**
 * Проверки формы карточки ППС — ровно те, что на бэкенде
 * (`TeacherRequestDto`): обязательны фамилия, имя и должность, у строк —
 * предельные длины, стаж неотрицателен. Правил сверх серверных нет
 * намеренно: форма не должна запрещать то, что сервер разрешает.
 *
 * Все поля — строки, включая стаж и селекты: `''` означает «не заполнено»
 * и превращается в `null` только на границе запроса
 * (`formValuesToRequest`). Форме с необязательными полями так проще жить:
 * react-hook-form не различает «пустую строку» и «не трогали».
 */

/** Почта проверяется целым валидатором zod, а не самодельным регэкспом. */
const emailFormat = z.email();

export const teacherCardSchema = z.object({
  lastName: z.string().trim().min(1, 'Укажите фамилию').max(150, 'Не длиннее 150 символов'),
  firstName: z.string().trim().min(1, 'Укажите имя').max(150, 'Не длиннее 150 символов'),
  patronymic: z.string().trim().max(150, 'Не длиннее 150 символов'),
  position: z.string().trim().min(1, 'Укажите должность').max(100, 'Не длиннее 100 символов'),
  // `''` — «без степени»: степень и звание в контракте необязательны.
  degree: z.literal('').or(z.enum(DEGREE_CODES)),
  rank: z.literal('').or(z.enum(RANK_CODES)),
  phoneNumber: z.string().trim().max(50, 'Не длиннее 50 символов'),
  email: z
    .string()
    .trim()
    .max(254, 'Не длиннее 254 символов')
    .refine((value) => value === '' || emailFormat.safeParse(value).success, 'Некорректный адрес почты'),
  messenger: z.string().trim().max(50, 'Не длиннее 50 символов'),
  // Целое и неотрицательное одним правилом: другим символам в поле
  // взяться неоткуда. Верхней границы нет и на сервере.
  experience: z.string().trim().regex(/^\d*$/, 'Стаж — целое число лет'),
  professionalExperience: z.string().trim().regex(/^\d*$/, 'Стаж — целое число лет'),
  education: z.string().trim(),
  qualification: z.string().trim(),
  bio: z.string().trim(),
  examScheduleGraduation: z.string().trim().max(200, 'Не длиннее 200 символов'),
  examScheduleNonGraduation: z.string().trim().max(200, 'Не длиннее 200 символов'),
});

export type TeacherCardFormValues = z.infer<typeof teacherCardSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа сервера. Имена совпадают с `TeacherRequestDto`
 * один в один, поэтому серверная валидация ложится на те же поля, что
 * и своя. `avatar` в списке нет: у него не текстовое поле, и его ошибки
 * бэкенд шлёт без словаря — одним `detail`.
 */
export const TEACHER_CARD_FIELDS = [
  'lastName',
  'firstName',
  'patronymic',
  'position',
  'degree',
  'rank',
  'phoneNumber',
  'email',
  'messenger',
  'experience',
  'professionalExperience',
  'education',
  'qualification',
  'bio',
  'examScheduleGraduation',
  'examScheduleNonGraduation',
] as const;

/** Карточка → значения формы: `null` контракта становится пустой строкой. */
export function teacherToFormValues(teacher: Teacher): TeacherCardFormValues {
  return {
    lastName: teacher.lastName,
    firstName: teacher.firstName,
    patronymic: teacher.patronymic ?? '',
    position: teacher.position,
    degree: teacher.degree ?? '',
    rank: teacher.rank ?? '',
    phoneNumber: teacher.phoneNumber ?? '',
    email: teacher.email ?? '',
    messenger: teacher.messenger ?? '',
    experience: teacher.experience === null ? '' : String(teacher.experience),
    professionalExperience:
      teacher.professionalExperience === null ? '' : String(teacher.professionalExperience),
    education: teacher.education ?? '',
    qualification: teacher.qualification ?? '',
    bio: teacher.bio ?? '',
    examScheduleGraduation: teacher.examScheduleGraduation ?? '',
    examScheduleNonGraduation: teacher.examScheduleNonGraduation ?? '',
  };
}

/**
 * Значения формы → тело `PUT`. Ключ аватара приходит отдельным аргументом:
 * он живёт не в полях формы, а в состоянии загрузки
 * (`useTeacherCardForm`).
 *
 * Пустые строки становятся `null` здесь, на границе запроса: контракт
 * ждёт незаполненное поле именно как `null`, а `""` в почте не прошёл бы
 * серверный `@Email`.
 */
export function formValuesToRequest(
  values: TeacherCardFormValues,
  avatar: string | null,
): TeacherUpsertRequest {
  return {
    lastName: values.lastName,
    firstName: values.firstName,
    patronymic: emptyToNull(values.patronymic),
    position: values.position,
    degree: values.degree === '' ? null : values.degree,
    rank: values.rank === '' ? null : values.rank,
    avatar,
    phoneNumber: emptyToNull(values.phoneNumber),
    email: emptyToNull(values.email),
    messenger: emptyToNull(values.messenger),
    experience: values.experience === '' ? null : Number(values.experience),
    professionalExperience:
      values.professionalExperience === '' ? null : Number(values.professionalExperience),
    education: emptyToNull(values.education),
    qualification: emptyToNull(values.qualification),
    bio: emptyToNull(values.bio),
    examScheduleGraduation: emptyToNull(values.examScheduleGraduation),
    examScheduleNonGraduation: emptyToNull(values.examScheduleNonGraduation),
  };
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
