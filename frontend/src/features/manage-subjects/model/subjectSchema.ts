import { z } from 'zod';

import type { Subject, SubjectRequest } from '@shared/types';

/**
 * Проверки формы дисциплины — ровно те, что на бэкенде
 * (`SubjectRequestDto`): название обязательно и не длиннее 100 символов,
 * описание свободно и ничем не ограничено. Правил сверх серверных нет:
 * форма не должна запрещать то, что сервер разрешает.
 *
 * Уникальность названия здесь не проверяется и проверена быть не может:
 * знает о ней только база. Отказ разбирается в `useSubjectForm`.
 */
export const subjectSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название дисциплины').max(100, 'Не длиннее 100 символов'),
  // Описание — строка, а не `string | null`: `''` означает «не заполнено»
  // и превращается в `null` на границе запроса. react-hook-form не умеет
  // отличать пустое поле от нетронутого, и `null` в форме означал бы
  // третье состояние, которого у поля ввода нет.
  description: z.string().trim(),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа бэкенда (`shared/lib/formErrors.ts`). Сообщение
 * о поле, которого здесь нет, уйдёт в общий баннер, а не потеряется.
 */
export const SUBJECT_FIELDS = ['name', 'description'] as const;

/**
 * Начальные значения формы: правка существующей дисциплины или создание
 * новой (`null`).
 *
 * Незаполненное описание приходит из контракта как `null`, а форме нужна
 * пустая строка — иначе React ругается на переход поля из неуправляемого
 * в управляемое.
 */
export function subjectToFormValues(subject: Subject | null): SubjectFormValues {
  return {
    name: subject?.name ?? '',
    description: subject?.description ?? '',
  };
}

/** Значения формы в тело запроса: пустое описание — это `null`. */
export function formValuesToRequest(values: SubjectFormValues): SubjectRequest {
  return {
    name: values.name.trim(),
    description: values.description.trim() === '' ? null : values.description.trim(),
  };
}
