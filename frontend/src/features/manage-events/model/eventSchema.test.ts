import { describe, expect, it } from 'vitest';

import { makeEvent } from '@shared/api/mocks';

import {
  DEFAULT_EVENT_COLOR,
  eventSchema,
  eventToFormValues,
  formValuesToRequest,
  type EventFormValues,
} from './eventSchema';

/** Местное время → ISO: тест не зависит от пояса машины. */
const at = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

const values = (overrides: Partial<EventFormValues> = {}): EventFormValues => ({
  name: 'Заседание кафедры',
  description: '',
  startDate: '2026-11-18',
  endDate: '2026-11-18',
  startTime: '10:00',
  endTime: '11:30',
  allDay: false,
  color: '#3f51b5',
  status: 'NOT_STARTED',
  assignedUserIds: [],
  ...overrides,
});

/** Сообщения схемы по полям: `{ endDate: '…' }`. */
function issues(input: EventFormValues): Record<string, string> {
  const result = eventSchema.safeParse(input);
  if (result.success) return {};

  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

describe('eventToFormValues', () => {
  it('новое событие — в выбранный день, 09:00–10:00, цвет портала, без назначенных', () => {
    expect(eventToFormValues(null, new Date(2026, 11, 3))).toEqual({
      name: '',
      description: '',
      startDate: '2026-12-03',
      endDate: '2026-12-03',
      startTime: '09:00',
      endTime: '10:00',
      allDay: false,
      color: DEFAULT_EVENT_COLOR,
      status: 'NOT_STARTED',
      assignedUserIds: [],
    });
  });

  it('событие со временем — местные дата и время, назначенные по id', () => {
    const event = makeEvent({
      startedAt: at(11, 17, 22),
      endedAt: at(11, 18, 2, 15),
      description: null,
      color: '#E91E63',
      status: 'IN_PROGRESS',
      assignedUsers: [
        { id: 102, lastName: 'Андреева', firstName: 'Ольга' },
        { id: 103, lastName: 'Баранов', firstName: 'Илья' },
      ],
    });

    expect(eventToFormValues(event, new Date())).toMatchObject({
      description: '',
      startDate: '2026-11-17',
      startTime: '22:00',
      endDate: '2026-11-18',
      endTime: '02:15',
      color: '#e91e63',
      status: 'IN_PROGRESS',
      assignedUserIds: [102, 103],
    });
  });

  it('«весь день» — даты включительно, время по умолчанию вместо полуночи', () => {
    const event = makeEvent({ allDay: true, startedAt: at(11, 10), endedAt: at(11, 12) });

    expect(eventToFormValues(event, new Date())).toMatchObject({
      allDay: true,
      startDate: '2026-11-10',
      endDate: '2026-11-12',
      startTime: '09:00',
      endTime: '10:00',
    });
  });

  it('цвет не по контракту заменяется умолчанием', () => {
    expect(eventToFormValues(makeEvent({ color: 'red' }), new Date()).color).toBe(DEFAULT_EVENT_COLOR);
    expect(eventToFormValues(makeEvent({ color: '#11a1f' }), new Date()).color).toBe(
      DEFAULT_EVENT_COLOR,
    );
  });
});

describe('formValuesToRequest', () => {
  it('событие со временем — местные моменты, пустое описание — null', () => {
    expect(formValuesToRequest(values({ description: '  \n ' }), 'NONE')).toEqual({
      name: 'Заседание кафедры',
      description: null,
      startedAt: at(11, 18, 10),
      endedAt: at(11, 18, 11, 30),
      allDay: false,
      color: '#3f51b5',
      status: 'NOT_STARTED',
      notificationFrequency: 'NONE',
      assignedUserIds: [],
    });
  });

  /**
   * Конец «весь день» — полночь последнего дня, а не следующего:
   * так пишет бэкенд и так читает календарь (`calendarItems`).
   */
  it('«весь день» — две местные полуночи, конец включительный, время не в счёт', () => {
    const body = formValuesToRequest(
      values({ allDay: true, startDate: '2026-11-10', endDate: '2026-11-12', startTime: '' }),
      'DAILY',
    );

    expect(body.startedAt).toBe(at(11, 10));
    expect(body.endedAt).toBe(at(11, 12));
    expect(body.allDay).toBe(true);
    // Частота — та, что пришла: `PUT` — полная замена.
    expect(body.notificationFrequency).toBe('DAILY');
  });

  it('туда и обратно — то же событие', () => {
    const event = makeEvent({
      startedAt: at(11, 3, 10),
      endedAt: at(11, 3, 11, 30),
      assignedUsers: [{ id: 104, lastName: 'Волков', firstName: 'Артём' }],
    });
    const body = formValuesToRequest(eventToFormValues(event, new Date()), event.notificationFrequency);

    expect(body).toMatchObject({
      startedAt: event.startedAt,
      endedAt: event.endedAt,
      description: event.description,
      assignedUserIds: [104],
    });
  });
});

describe('eventSchema', () => {
  it('пропускает равные начало и конец — контракт их принимает', () => {
    expect(issues(values({ endTime: '10:00', startTime: '10:00' }))).toEqual({});
  });

  it('не пускает дату окончания раньше даты начала', () => {
    expect(issues(values({ endDate: '2026-11-17' }))).toEqual({
      endDate: 'Дата окончания раньше даты начала',
    });
  });

  it('не пускает время окончания раньше начала в один день, но через полночь — пускает', () => {
    expect(issues(values({ startTime: '12:00', endTime: '11:00' }))).toEqual({
      endTime: 'Время окончания раньше времени начала',
    });
    expect(issues(values({ startTime: '22:00', endTime: '02:00', endDate: '2026-11-19' }))).toEqual(
      {},
    );
  });

  it('у «весь день» время не спрашивает и не сравнивает', () => {
    expect(
      issues(values({ allDay: true, startTime: '', endTime: '', endDate: '2026-11-18' })),
    ).toEqual({});
    expect(issues(values({ allDay: true, startTime: '12:00', endTime: '11:00' }))).toEqual({});
  });

  it('требует название, даты, время и цвет по контракту', () => {
    expect(
      issues(values({ name: '   ', startDate: '', startTime: '', color: 'red' })),
    ).toMatchObject({
      name: 'Укажите название',
      startDate: 'Укажите дату начала',
      startTime: 'Укажите время начала',
      color: 'Цвет — решётка и шесть шестнадцатеричных цифр',
    });
    expect(issues(values({ name: 'я'.repeat(201) }))).toEqual({ name: 'Не длиннее 200 символов' });
  });
});
