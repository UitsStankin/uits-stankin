import { z } from 'zod';

import type { Helper, HelperRequest } from '@shared/types';

/**
 * Проверки формы карточки УВП — ровно те, что на бэкенде
 * (`HelpersEmployeeRequestDto`): обязательны фамилия, имя и должность,
 * у строк предельные длины. Правил сверх серверных нет: форма
 * не должна запрещать то, что сервер разрешает.
 *
 * Отчество — строка, а не `string | null`: `''` означает «не заполнено»
 * и превращается в `null` на границе запроса. react-hook-form не умеет
 * отличать пустое поле от нетронутого, и `null` в форме означал бы третье
 * состояние, которого у поля ввода нет.
 *
 * Своя схема, а не общая с карточкой ППС, хотя четыре поля из четырёх
 * совпадают: совпадают они сегодня и по совпадению DTO, а не потому,
 * что это одна сущность. У ППС в том же `TeacherRequestDto` лежат ещё
 * четырнадцать полей, и общая схема была бы схемой ППС, из которой УВП
 * выбирает четыре, — то есть УВП чинился бы при каждой правке карточки
 * преподавателя.
 */
export const helperSchema = z.object({
  lastName: z.string().trim().min(1, 'Укажите фамилию').max(150, 'Не длиннее 150 символов'),
  firstName: z.string().trim().min(1, 'Укажите имя').max(150, 'Не длиннее 150 символов'),
  patronymic: z.string().trim().max(150, 'Не длиннее 150 символов'),
  position: z.string().trim().min(1, 'Укажите должность').max(100, 'Не длиннее 100 символов'),
});

export type HelperFormValues = z.infer<typeof helperSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа бэкенда (`shared/lib/formErrors.ts`). Имена совпадают
 * с DTO один в один.
 *
 * `avatar` в списке нет: в форме это не поле ввода, а состояние загрузки,
 * и подсветить его `setError` нельзя. Отказ по ключу фото уйдёт в общий
 * баннер, а не потеряется.
 */
export const HELPER_FIELDS = ['lastName', 'firstName', 'position', 'patronymic'] as const;

/** Карточка → значения формы: `null` контракта становится пустой строкой. */
export function helperToFormValues(helper: Helper | null): HelperFormValues {
  return {
    lastName: helper?.lastName ?? '',
    firstName: helper?.firstName ?? '',
    patronymic: helper?.patronymic ?? '',
    position: helper?.position ?? '',
  };
}

/**
 * Значения формы → тело запроса. Ключ фото приходит отдельным аргументом:
 * он живёт не в полях формы, а в состоянии загрузки (`useHelperForm`).
 */
export function formValuesToRequest(values: HelperFormValues, avatar: string | null): HelperRequest {
  return {
    lastName: values.lastName,
    firstName: values.firstName,
    patronymic: values.patronymic === '' ? null : values.patronymic,
    position: values.position,
    avatar,
  };
}
