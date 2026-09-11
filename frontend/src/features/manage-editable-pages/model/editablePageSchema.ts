import { z } from 'zod';

import type { EditablePage, EditablePageRequest } from '@shared/types';

/**
 * Проверки формы раздела — ровно те, что на бэкенде
 * (`EditablePageRequestDto`).
 */
export const editablePageSchema = z.object({
  /*
   * Подпись обязательна на запись, хотя в ответе бывает `null`: в строках,
   * перенесённых со старого портала, она заполнена не везде. Контракт
   * говорит об этом прямо — раздел, прочитанный с `title: null`, сохранить,
   * не заполнив подпись, нельзя, и форма обязана требовать её до запроса.
   */
  title: z.string().trim().min(1, 'Укажите подпись раздела').max(255, 'Не длиннее 255 символов'),

  /*
   * Исходник — как есть: без `trim` и без проверки на пустоту. Пробелы
   * в конце строки в Markdown означают перенос, и срезанные они молча
   * склеили бы строки адреса в одну. Пустая строка — законное «опустошить
   * раздел»: на сайте он покажется надписью «Раздел пока не заполнен».
   */
  text: z.string(),
});

export type EditablePageFormValues = z.infer<typeof editablePageSchema>;

/** Поля, по которым раскладывается словарь `errors` из ответа бэкенда. */
export const EDITABLE_PAGE_FIELDS = ['title', 'text'] as const;

/** Начальные значения формы. Пустая подпись вместо `null` — это поле ввода. */
export function editablePageToFormValues(page: EditablePage): EditablePageFormValues {
  return { title: page.title ?? '', text: page.text };
}

/**
 * Значения формы в тело `PUT`. `text` уходит строкой даже пустой: `null`
 * там — `400`, и серверный десериализатор этого поля пустую строку в `null`
 * не превращает (docs/API.md, «Редактируемые страницы»).
 */
export function formValuesToRequest(values: EditablePageFormValues): EditablePageRequest {
  return { title: values.title, text: values.text };
}
