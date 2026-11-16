import { http, HttpResponse } from 'msw';

import type { EventPerson, UserEvent, UserEventRequest } from '@shared/types';

import { numberParam, pageResponse } from './page';
import { problemResponse } from './problemResponse';
import { userDirectoryFixture } from './users';

/** `*` вместо origin — по той же причине, что и у новостей. */
const EVENTS = '*/api/events';
const EVENT_ITEM = '*/api/events/:id';

/** Размер страницы календаря у контракта — `50`, а не общие `20`. */
const EVENTS_PAGE_SIZE = 50;

const [abramov, andreeva, baranov, volkov] = userDirectoryFixture;

/** Одно событие со всеми полями контракта: час заседания, без назначенных. */
export function makeEvent(overrides: Partial<UserEvent> = {}): UserEvent {
  return {
    id: 1,
    name: 'Заседание кафедры',
    description: 'Обсуждение нагрузки на весенний семестр',
    startedAt: '2026-09-01T10:00:00+03:00',
    endedAt: '2026-09-01T11:30:00+03:00',
    allDay: false,
    color: '#3F51B5',
    status: 'NOT_STARTED',
    notificationFrequency: 'NONE',
    nextNotificationAt: null,
    owner: abramov,
    assignedUsers: [],
    ...overrides,
  };
}

/** Момент `day` числа месяца `base` в `hour:minute` по местному времени. */
function at(base: Date, day: number, hour = 0, minute = 0): string {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    day,
    hour,
    minute,
  ).toISOString();
}

/**
 * События вокруг месяца `base`: под `VITE_ENABLE_MOCKS` календарь
 * открывается на текущем месяце, и он не должен быть пустым.
 *
 * Моменты собираются из местного времени и уходят в `toISOString()` —
 * с `Z`, а не с `+03:00`. Так фикстура не зависит от пояса машины:
 * событие в 10:00 остаётся в 10:00 и в Москве, и на раннере CI в UTC.
 *
 * Крайние случаи заведены нарочно: «весь день» на три дня (конец
 * включительный — полночь последнего дня, как пишет бэкенд), событие
 * через полночь, событие без описания, назначенное с пустым ФИО,
 * несколько событий в один день и событие прошлого месяца — чтобы
 * листание назад что-то показывало.
 */
export function eventsAround(base: Date): UserEvent[] {
  const unnamed = userDirectoryFixture[userDirectoryFixture.length - 1];

  return [
    makeEvent({
      id: 1,
      name: 'Отчёт по НИР за полугодие',
      startedAt: at(base, -4, 9),
      endedAt: at(base, -4, 18),
      color: '#795548',
      status: 'COMPLETED',
    }),
    makeEvent({
      id: 2,
      name: 'Заседание кафедры',
      startedAt: at(base, 3, 10),
      endedAt: at(base, 3, 11, 30),
      assignedUsers: [andreeva, baranov],
    }),
    makeEvent({
      id: 3,
      name: 'Приём курсовых работ',
      description: null,
      startedAt: at(base, 3, 14),
      endedAt: at(base, 3, 16),
      color: '#E91E63',
      status: 'IN_PROGRESS',
      owner: volkov,
      assignedUsers: [abramov],
    }),
    makeEvent({
      id: 4,
      name: 'Методическая неделя',
      description: 'Открытые занятия и взаимопосещения',
      startedAt: at(base, 10),
      endedAt: at(base, 12),
      allDay: true,
      color: '#009688',
      notificationFrequency: 'DAILY',
      assignedUsers: [andreeva, baranov, volkov, unnamed],
    }),
    makeEvent({
      id: 5,
      name: 'Ночная проверка сервера кафедры',
      description: 'Плановые работы, портал недоступен',
      startedAt: at(base, 17, 22),
      endedAt: at(base, 18, 2),
      color: '#FF9800',
    }),
    makeEvent({
      id: 6,
      name: 'Сдача ведомостей',
      startedAt: at(base, 24, 12),
      endedAt: at(base, 24, 12),
      color: '#F44336',
      status: 'IN_PROGRESS',
      notificationFrequency: 'WEEKLY',
    }),
  ];
}

/**
 * Календарь событий — чтение списка. Поштучного `GET /api/events/{id}`
 * здесь нет: календарь его не зовёт, вся выдача и так приходит списком.
 *
 * Список берётся аргументом: тест пустого календаря — одна строка
 * `server.use(...eventHandlers([]))`. Без аргумента события строятся
 * вокруг текущей даты **на каждый запрос**, а не раз при загрузке модуля:
 * тест, переставивший часы (`vi.setSystemTime`), получает события вокруг
 * своего «сегодня».
 *
 * Отбора «моё или мне назначено» мок не повторяет: вошедший в моках —
 * один, и все события фикстуры считаются его. Порядок — по началу,
 * как у ручки по умолчанию.
 *
 * **Создание, правка и удаление помнят себя в замыкании набора** (F-60):
 * без этого чтение после правки не изменилось бы. До первой записи
 * выдача по-прежнему строится на каждый запрос; первая запись
 * замораживает её. Стандартный набор создаётся раз на файл тестов,
 * поэтому тест, который пишет, ставит себе свежий в `beforeEach` —
 * как тест импорта расписания.
 *
 * Отказы — те же, что у бэкенда: словарь `errors` у `@Valid` (название,
 * цвет), одним `detail` — конец раньше начала и неизвестный назначенный.
 * Владелец нового события — первая учётка справочника: вошедший в моках.
 */
export function eventHandlers(items?: readonly UserEvent[]) {
  let stored: UserEvent[] | null = null;
  let nextId = 1000;

  const base = () => stored ?? [...(items ?? eventsAround(new Date()))];
  const current = () =>
    base().sort(
      (a, b) =>
        Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id - b.id,
    );

  return [
    http.get(EVENTS, ({ request }) => {
      const url = new URL(request.url);

      // Больше сотни контракт не отдаёт: больший `size` урезается молча.
      const size = Math.min(numberParam(url, 'size', EVENTS_PAGE_SIZE, 1), 100);

      return HttpResponse.json(
        pageResponse(current(), numberParam(url, 'page', 0), size),
      );
    }),

    http.post(EVENTS, async ({ request }) => {
      const body = (await request.json()) as UserEventRequest;
      const people = knownPeople(base());
      const refusal = validate(body, people, '/api/events');
      if (refusal) return refusal;

      const created = fromRequest(body, people, nextId++, abramov);
      stored = [...base(), created];

      return HttpResponse.json(created, {
        status: 201,
        headers: { Location: `/api/events/${String(created.id)}` },
      });
    }),

    http.put(EVENT_ITEM, async ({ params, request }) => {
      const id = Number(params.id);
      const existing = base().find((event) => event.id === id);
      if (!existing) return notFound(id);

      const body = (await request.json()) as UserEventRequest;
      const people = knownPeople(base());
      const refusal = validate(body, people, `/api/events/${String(id)}`);
      if (refusal) return refusal;

      // Полная замена, включая назначенных; владелец остаётся прежним.
      const updated = fromRequest(body, people, id, existing.owner);
      stored = base().map((event) => (event.id === id ? updated : event));

      return HttpResponse.json(updated);
    }),

    http.delete(EVENT_ITEM, ({ params }) => {
      const id = Number(params.id);
      if (!base().some((event) => event.id === id)) return notFound(id);

      stored = base().filter((event) => event.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Учётки, которых мок «знает»: справочник и все, кто уже стоит на событиях.
 * Бэкенд проверяет назначенных на существование, а не по справочнику —
 * заблокированный, оставшийся на событии, проходит.
 */
function knownPeople(events: readonly UserEvent[]): EventPerson[] {
  const people = new Map<number, EventPerson>();

  for (const person of [
    ...userDirectoryFixture,
    ...events.flatMap((event) => [event.owner, ...event.assignedUsers]),
  ]) {
    people.set(person.id, person);
  }

  return [...people.values()];
}

/** Отказ в духе бэкенда (`UserEventRequestDto`, `UserEventService`) или `null`. */
function validate(body: UserEventRequest, people: readonly EventPerson[], instance: string) {
  const errors: Record<string, string[]> = {};

  if (body.name.trim() === '') errors.name = ['Название обязательно'];
  else if (body.name.length > 200) errors.name = ['Название не длиннее 200 символов'];

  if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
    errors.color = ['Цвет — решётка и шесть шестнадцатеричных цифр, например #3F51B5'];
  }

  if (Object.keys(errors).length > 0) {
    return problemResponse(400, {
      title: 'Bad Request',
      detail: Object.values(errors).flat().join(' '),
      instance,
      errors,
    });
  }

  if (Date.parse(body.endedAt) < Date.parse(body.startedAt)) {
    return problemResponse(400, {
      title: 'Bad Request',
      detail: 'Дата окончания не может быть раньше даты начала',
      instance,
    });
  }

  if (body.assignedUserIds.some((id) => !people.some((person) => person.id === id))) {
    return problemResponse(400, {
      title: 'Bad Request',
      detail: 'Среди назначенных есть несуществующие пользователи',
      instance,
    });
  }

  return null;
}

/** Тело запроса — в событие ответа. Моменты сервер отдаёт в UTC с `Z`. */
function fromRequest(
  body: UserEventRequest,
  people: readonly EventPerson[],
  id: number,
  owner: EventPerson,
): UserEvent {
  return {
    id,
    name: body.name,
    description: body.description,
    startedAt: new Date(body.startedAt).toISOString(),
    endedAt: new Date(body.endedAt).toISOString(),
    allDay: body.allDay,
    color: body.color,
    status: body.status,
    notificationFrequency: body.notificationFrequency,
    nextNotificationAt: null,
    owner,
    assignedUsers: [...new Set(body.assignedUserIds)].flatMap((assignedId) =>
      people.filter((person) => person.id === assignedId),
    ),
  };
}

function notFound(id: number) {
  return problemResponse(404, {
    title: 'Not Found',
    detail: `Событие id=${String(id)} не найдено`,
    instance: `/api/events/${String(id)}`,
  });
}
