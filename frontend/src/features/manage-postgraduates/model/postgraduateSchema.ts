import { z } from 'zod';

import type { PostgraduateDetails, PostgraduateRequest } from '@shared/types';

/** Нижняя граница года поступления — та же, что у сервера (`@Min(2000)`). */
const MIN_ADMISSION_YEAR = 2000;

/**
 * Проверки формы записи аспирантуры — ровно те, что на бэкенде
 * (`StudentRequestDto` и `PostgraduateService.validated`). Правил сверх
 * серверных нет: форма не должна запрещать то, что сервер разрешает.
 *
 * **Поля вложены так же, как в теле запроса** — `student.lastName`,
 * а не плоское `lastName`. Ради словаря отказа: `@Valid` на вложенном
 * объекте называет поле путём (`student.lastName`), react-hook-form
 * понимает тот же путь, и серверная ошибка ложится под своё поле без
 * переименования. Плоская форма потребовала бы таблицы соответствий,
 * которая разошлась бы с DTO на первом новом поле.
 *
 * Год — строка, а не число: в поле ввода его набирают, и пустое поле —
 * это `''`, а не `NaN`. В число он превращается на границе запроса.
 * «Не в будущем» проверяется здесь же, хотя на сервере это не `@Valid`,
 * а проверка сервиса без словаря: под полем ей место, в баннере — нет.
 * Часы клиента могут разойтись с серверными в новогоднюю ночь — тогда
 * отказ придёт баннером, ничего не сломав.
 *
 * Уровня образования в форме нет: в записи аспирантуры он может быть
 * только `POSTGRADUATE` (проверяет сервер), и выбор из одного варианта —
 * не поле, а шум. В тело он подставляется константой.
 *
 * Строки — `''` вместо `null`, как у остальных форм портала: поле ввода
 * не знает третьего состояния. Пустые необязательные поля превращаются
 * в `null` на границе запроса.
 */
export const postgraduateSchema = z.object({
  student: z.object({
    lastName: z.string().trim().min(1, 'Укажите фамилию').max(50, 'Не длиннее 50 символов'),
    firstName: z.string().trim().min(1, 'Укажите имя').max(50, 'Не длиннее 50 символов'),
    patronymic: z.string().trim().max(50, 'Не длиннее 50 символов'),
    group: z.string().trim().min(1, 'Укажите группу').max(16, 'Не длиннее 16 символов'),
    speciality: z.string().trim().max(100, 'Не длиннее 100 символов'),
    // Длиной не ограничена: колонка `TEXT`.
    diplomaTheme: z.string().trim(),
    admissionYear: z
      .string()
      .trim()
      .min(1, 'Укажите год поступления')
      .regex(/^\d{4}$/, 'Год — четыре цифры, например 2024')
      .refine((year) => Number(year) >= MIN_ADMISSION_YEAR, 'Не раньше 2000 года')
      // Функция, а не значение: год берётся в момент проверки, и форма,
      // открытая тридцать первого декабря, не застрянет в прошлом году.
      .refine((year) => Number(year) <= new Date().getFullYear(), 'Год поступления не может быть в будущем'),
  }),

  /**
   * Научный руководитель; `null` — не назначен. Число, а не строка
   * выпадающего списка: поле живёт через `Controller`, и «пустой пункт —
   * это `null`» переводит сам список (`TeacherSelect` из `entities/teacher`).
   */
  teacherId: z.number().nullable(),
});

export type PostgraduateFormValues = z.infer<typeof postgraduateSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа бэкенда. Имена — пути из DTO один в один.
 *
 * `student.educationLevel` в списке нет: в форме его нет, и отказ по нему
 * уйдёт в общий баннер, а не потеряется.
 */
export const POSTGRADUATE_FIELDS = [
  'student.lastName',
  'student.firstName',
  'student.patronymic',
  'student.group',
  'student.speciality',
  'student.diplomaTheme',
  'student.admissionYear',
  'teacherId',
] as const;

/** Запись → значения формы; `null` — новая запись. */
export function postgraduateToFormValues(
  postgraduate: PostgraduateDetails | null,
): PostgraduateFormValues {
  const student = postgraduate?.student;

  return {
    student: {
      lastName: student?.lastName ?? '',
      firstName: student?.firstName ?? '',
      patronymic: student?.patronymic ?? '',
      group: student?.group ?? '',
      speciality: student?.speciality ?? '',
      diplomaTheme: student?.diplomaTheme ?? '',
      admissionYear: student ? String(student.admissionYear) : '',
    },
    teacherId: postgraduate?.teacherId ?? null,
  };
}

/** Значения формы → тело запроса: пустое необязательное становится `null`. */
export function formValuesToRequest(values: PostgraduateFormValues): PostgraduateRequest {
  const { student } = values;

  return {
    student: {
      lastName: student.lastName,
      firstName: student.firstName,
      patronymic: emptyToNull(student.patronymic),
      group: student.group,
      educationLevel: 'POSTGRADUATE',
      speciality: emptyToNull(student.speciality),
      diplomaTheme: emptyToNull(student.diplomaTheme),
      admissionYear: Number(student.admissionYear),
    },
    teacherId: values.teacherId,
  };
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
