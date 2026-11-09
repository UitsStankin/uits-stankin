import { z } from 'zod';

import type { Conference, ConferenceRequest } from '@shared/types';

/**
 * Проверки формы объявления — ровно те, что на бэкенде
 * (`ConferenceRequestDto` и `ConferenceDatesValidator`). Правил сверх
 * серверных нет: форма не должна запрещать то, что сервер разрешает.
 *
 * Поэтому **адрес почты по формату здесь не проверяется**, хотя сервер
 * его проверяет. Серверный `@Email` мягче любой клиентской проверки —
 * он пропускает, например, адрес без точки в домене, — и строгая схема
 * запретила бы то, что сохранилось бы без вопросов. Отказ по формату
 * приходит словарём `errors` и встаёт под поле сам.
 */
export const conferenceSchema = z
  .object({
    title: z.string().trim().min(1, 'Укажите название').max(255, 'Не длиннее 255 символов'),

    // Необязательные текстовые поля — строки, а не `string | null`: `''`
    // означает «не заполнено» и превращается в `null` на границе запроса.
    // react-hook-form не умеет отличать пустое поле от нетронутого, и `null`
    // в форме означал бы третье состояние, которого у поля ввода нет.
    description: z.string().trim(),

    // Дата и время — строки родных полей (`YYYY-MM-DD`, `HH:mm`) либо `''`.
    // Разбирать их в `Date` незачем: календарная дата без зоны и есть то,
    // что ждёт контракт, а сравнение двух дат в этом виде — сравнение строк.
    startDate: z.string(),
    endDate: z.string(),
    time: z.string(),

    organizer: z.string().trim().max(255, 'Не длиннее 255 символов'),
    contactEmail: z.string().trim().max(254, 'Не длиннее 254 символов'),
    contactPhone: z.string().trim().max(32, 'Не длиннее 32 символов'),

    /*
     * Содержание необязательно — в отличие от новости и достижения:
     * у объявления о конференции часто нет ничего, кроме дат и контактов.
     * Пустое поле редактора приходит сюда пустой строкой, а не `<p></p>`
     * (`isEmptyHtml` в `shared/ui/RichTextEditor`).
     */
    content: z.string(),

    previewImageDescription: z.string().trim().max(256, 'Не длиннее 256 символов'),

    // Признак публикации обязателен по контракту: тело без него — `400`,
    // а не «скрыто по умолчанию». У флажка третьего состояния нет.
    display: z.boolean(),
  })
  /*
   * Связка дат — те же три правила и те же слова, что у серверного
   * `ConferenceDatesValidator`, и под теми же полями. Повторять их на клиенте
   * стоит: конец без начала — это обычная ошибка человека, заполняющего
   * форму сверху вниз, и отказ по ней иначе приходит после отправки всей
   * статьи вместе с картинками.
   */
  .superRefine((values, context) => {
    if (values.startDate === '') {
      if (values.endDate !== '') {
        context.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: 'Дата окончания указана без даты начала',
        });
      }

      if (values.time !== '') {
        context.addIssue({
          code: 'custom',
          path: ['time'],
          message: 'Время начала указано без даты начала',
        });
      }
    } else if (values.endDate !== '' && values.endDate < values.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Дата окончания раньше даты начала',
      });
    }
  });

export type ConferenceFormValues = z.infer<typeof conferenceSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа бэкенда (`shared/lib/formErrors.ts`). Связка дат
 * приходит под `endDate` и `time` — оба здесь есть.
 *
 * `previewImage` в списке нет намеренно, как и у новости: в форме это
 * не поле ввода, а состояние загрузки. Отказ по ключу обложки («Файл
 * обложки не найден») приходит одним `detail` и уйдёт в общий баннер.
 */
export const CONFERENCE_FIELDS = [
  'title',
  'description',
  'startDate',
  'endDate',
  'time',
  'organizer',
  'contactEmail',
  'contactPhone',
  'content',
  'previewImageDescription',
  'display',
] as const;

/**
 * Начальные значения формы: правка существующего объявления или новое
 * (`null`).
 *
 * Новое объявление заводится опубликованным — как новость, и по той же
 * причине: скрытое по умолчанию означало бы, что модератор сохранил
 * объявление и не нашёл его на сайте. В старой модели признак был обратным
 * (`is_hidden`, по умолчанию `False`), то есть и там новое объявление было
 * видно сразу.
 */
export function conferenceToFormValues(conference: Conference | null): ConferenceFormValues {
  return {
    title: conference?.title ?? '',
    description: conference?.description ?? '',
    startDate: conference?.startDate ?? '',
    endDate: conference?.endDate ?? '',
    time: conference?.time ?? '',
    organizer: conference?.organizer ?? '',
    contactEmail: conference?.contactEmail ?? '',
    contactPhone: conference?.contactPhone ?? '',
    content: conference?.content ?? '',
    previewImageDescription: conference?.previewImageDescription ?? '',
    display: conference?.display ?? true,
  };
}

/**
 * Значения формы в тело запроса. Ключ обложки приходит отдельным
 * аргументом: он живёт не в полях формы, а в состоянии загрузки.
 *
 * Пустые строки уезжают `null`. Для строковых полей это необязательно —
 * сервер сам превращает пустую строку в `null` (docs/API.md, «Базовое»), —
 * но у дат и времени поле не строковое, и пустая строка там не обязана
 * разобраться вовсе. Одно правило на все поля проще, чем помнить, у каких
 * оно лишнее.
 *
 * Описание обложки без самой обложки не отправляется: без картинки оно
 * ничего не описывает, и оставшееся от снятой обложки всплыло бы подписью
 * у следующей.
 */
export function formValuesToRequest(
  values: ConferenceFormValues,
  previewImage: string | null,
): ConferenceRequest {
  return {
    title: values.title,
    description: emptyToNull(values.description),
    startDate: emptyToNull(values.startDate),
    endDate: emptyToNull(values.endDate),
    time: emptyToNull(values.time),
    organizer: emptyToNull(values.organizer),
    contactEmail: emptyToNull(values.contactEmail),
    contactPhone: emptyToNull(values.contactPhone),
    content: emptyToNull(values.content),
    previewImage,
    previewImageDescription:
      previewImage === null ? null : emptyToNull(values.previewImageDescription),
    display: values.display,
  };
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
