import { http, HttpResponse } from 'msw';

import type { UserEvent } from '@shared/types';

import { numberParam, pageResponse } from './page';
import { userDirectoryFixture } from './users';

/** `*` вместо origin — по той же причине, что и у новостей. */
const EVENTS = '*/api/events';

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
 */
export function eventHandlers(items?: readonly UserEvent[]) {
  const current = () =>
    [...(items ?? eventsAround(new Date()))].sort(
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
  ];
}
