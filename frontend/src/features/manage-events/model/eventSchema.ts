import { z } from 'zod';

import type { NotificationFrequency, UserEvent, UserEventRequest } from '@shared/types';

import { localDate, localTime, toMoment } from '../lib/eventMoments';

/** Цвет нового события — `primary` портала, он же умолчание оригинала. */
export const DEFAULT_EVENT_COLOR = '#11a1fd';

/** Время нового события и того, с которого сняли «весь день». */
const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '10:00';

/** Тот же вид, что у бэкенда (`UserEventRequestDto`, `@Pattern`). */
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Проверки формы события — те же, что у бэкенда (`UserEventRequestDto`
 * и `UserEventService`), и ни одной сверх: форма не запрещает того, что
 * сервер разрешает.
 *
 * Поэтому **равные начало и конец допустимы**, хотя оригинал их запрещал
 * («время начала должно быть до времени окончания»): контракт их
 * принимает, и событие-отметка «сдать ведомости в 12:00» — законное.
 *
 * Дата и время — строки родных полей. Сравнивать их можно как строки:
 * `YYYY-MM-DD` и `HH:mm` упорядочены так же, как моменты.
 */
export const eventSchema = z
  .object({
    name: z.string().trim().min(1, 'Укажите название').max(200, 'Не длиннее 200 символов'),
    description: z.string(),
    startDate: z.string().min(1, 'Укажите дату начала'),
    endDate: z.string().min(1, 'Укажите дату окончания'),
    startTime: z.string(),
    endTime: z.string(),
    allDay: z.boolean(),
    color: z.string().regex(COLOR_PATTERN, 'Цвет — решётка и шесть шестнадцатеричных цифр'),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    assignedUserIds: z.array(z.number()),
  })
  .superRefine((values, context) => {
    // У «весь день» время не спрашивается и не проверяется: поля скрыты,
    // и ошибка под невидимым полем была бы кнопкой, которая не работает.
    if (!values.allDay) {
      if (values.startTime === '') {
        context.addIssue({ code: 'custom', path: ['startTime'], message: 'Укажите время начала' });
      }

      if (values.endTime === '') {
        context.addIssue({ code: 'custom', path: ['endTime'], message: 'Укажите время окончания' });
      }
    }

    if (values.startDate === '' || values.endDate === '') return;

    if (values.endDate < values.startDate) {
      context.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'Дата окончания раньше даты начала',
      });
    } else if (
      !values.allDay &&
      values.endDate === values.startDate &&
      values.startTime !== '' &&
      values.endTime !== '' &&
      values.endTime < values.startTime
    ) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'Время окончания раньше времени начала',
      });
    }
  });

export type EventFormValues = z.infer<typeof eventSchema>;

/**
 * Поля, на которые раскладывается словарь `errors` из ответа. Имена
 * сервера (`startedAt`, `endedAt`) переводятся в имена формы
 * в `SERVER_FIELD_ALIASES`: момента в форме нет, есть дата и время,
 * и отказ по моменту встаёт под его дату.
 */
export const EVENT_FIELDS = [
  'name',
  'description',
  'startDate',
  'endDate',
  'allDay',
  'color',
  'status',
  'assignedUserIds',
] as const;

export const SERVER_FIELD_ALIASES: Readonly<Record<string, (typeof EVENT_FIELDS)[number]>> = {
  startedAt: 'startDate',
  endedAt: 'endDate',
};

/**
 * Начальные значения: правка существующего события или новое (`null`)
 * в день `day`.
 *
 * Части даты и времени берутся местные — те же, что видит календарь.
 * У «весь день» время в событии — полночь, и показывать её незачем:
 * сняв флажок, человек увидит 09:00–10:00, а не 00:00–00:00.
 *
 * **Цвет не по контракту заменяется умолчанием.** Перенесённые
 * из старого портала данные могут хранить цвет иначе, а `<input
 * type="color">` такое значение не покажет (покажет чёрный), и сервер
 * его не примет — форма не сохранилась бы, пока цвет не тронут.
 * Замену форма называет вслух (`isColorReplaced`).
 */
export function eventToFormValues(event: UserEvent | null, day: Date): EventFormValues {
  if (!event) {
    return {
      name: '',
      description: '',
      startDate: localDate(day),
      endDate: localDate(day),
      startTime: DEFAULT_START_TIME,
      endTime: DEFAULT_END_TIME,
      allDay: false,
      color: DEFAULT_EVENT_COLOR,
      status: 'NOT_STARTED',
      assignedUserIds: [],
    };
  }

  const start = new Date(event.startedAt);
  const end = new Date(event.endedAt);

  return {
    name: event.name,
    description: event.description ?? '',
    startDate: localDate(start),
    endDate: localDate(end),
    startTime: event.allDay ? DEFAULT_START_TIME : localTime(start),
    endTime: event.allDay ? DEFAULT_END_TIME : localTime(end),
    allDay: event.allDay,
    color: isColorValid(event.color) ? event.color.toLowerCase() : DEFAULT_EVENT_COLOR,
    status: event.status,
    assignedUserIds: event.assignedUsers.map(({ id }) => id),
  };
}

/** Цвет события в том виде, который примет сервер и покажет `<input type="color">`. */
export function isColorValid(color: string): boolean {
  return COLOR_PATTERN.test(color);
}

/**
 * Значения формы — в тело запроса.
 *
 * «Весь день» уходит двумя местными полуночами, и конец — полночь
 * **последнего** дня, а не следующего: так пишет бэкенд и так читает
 * календарь (`calendarItems`). Поля времени при этом игнорируются,
 * что бы в них ни осталось.
 *
 * `notificationFrequency` формы не показывается — напоминаний нет
 * (ARCHITECTURE.md §8, п. 14), — но обязателен, а `PUT` — полная
 * замена. Поэтому правка возвращает то, что пришло, а новое событие
 * уходит с `NONE`: строка «каждую неделю» в базе обещала бы то,
 * чего не случится.
 */
export function formValuesToRequest(
  values: EventFormValues,
  notificationFrequency: NotificationFrequency,
): UserEventRequest {
  const description = values.description.trim();

  return {
    name: values.name.trim(),
    description: description === '' ? null : description,
    startedAt: toMoment(values.startDate, values.allDay ? undefined : values.startTime),
    endedAt: toMoment(values.endDate, values.allDay ? undefined : values.endTime),
    allDay: values.allDay,
    color: values.color,
    status: values.status,
    notificationFrequency,
    assignedUserIds: values.assignedUserIds,
  };
}
