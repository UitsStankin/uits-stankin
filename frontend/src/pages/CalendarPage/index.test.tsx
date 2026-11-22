import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { eventHandlers, makeEvent, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { UserEventRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import CalendarPage from './index';

/*
 * Ленивый кусок календаря — статическим импортом, по той же причине,
 * что у редактора в тестах личного кабинета: первый `findBy` иначе ждёт
 * не рендера, а разбора FullCalendar, и на раннере CI это дольше секунды.
 * `lazy()` при этом остаётся на месте.
 */
import './ui/EventCalendar/FullCalendarView';

const EVENTS = '*/api/events';

/** Местное время → ISO: тест не зависит от пояса машины. */
const at = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).toISOString();

/** Узкие пробелы ICU — в обычные: проверяется текст, а не вид пробела. */
const text = (element: HTMLElement) => element.textContent.replace(/\s/g, ' ');

beforeEach(() => {
  // «Сегодня» — понедельник 16 ноября 2026: события мока строятся
  // вокруг него, а заголовок месяца известен заранее.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCalendar() {
  return renderWithProviders(<CalendarPage />, { route: '/corp/calendar' });
}

describe('CalendarPage', () => {
  it('открывается на текущем месяце с событиями из выдачи', async () => {
    renderCalendar();

    expect(await screen.findByText('Заседание кафедры')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ноябрь 2026' })).toBeInTheDocument();
    expect(screen.getByText('Методическая неделя')).toBeInTheDocument();
    // Текущий месяц на экране — возвращаться к нему незачем.
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Месяц' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('листает месяцы и возвращается к текущему', async () => {
    renderCalendar();
    await screen.findByText('Заседание кафедры');

    fireEvent.click(screen.getByRole('button', { name: 'Предыдущий месяц' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Октябрь 2026' })).toBeInTheDocument();
    // Событие прошлого месяца мока — 27 октября.
    expect(await screen.findByText('Отчёт по НИР за полугодие')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Сегодня' }));

    expect(screen.getByRole('heading', { level: 2, name: 'Ноябрь 2026' })).toBeInTheDocument();
  });

  it('переключает вид: неделя с понедельника, листание неделями', async () => {
    renderCalendar();
    await screen.findByText('Заседание кафедры');

    fireEvent.click(screen.getByRole('button', { name: 'Неделя' }));

    expect(text(screen.getByRole('heading', { level: 2 }))).toBe('16–22 ноября 2026 г.');
    expect(screen.getByRole('button', { name: 'Неделя' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Следующая неделя' }));

    expect(text(screen.getByRole('heading', { level: 2 }))).toBe('23–29 ноября 2026 г.');
  });

  it('по клику открывает событие целиком', async () => {
    renderCalendar();
    fireEvent.click(await screen.findByText('Заседание кафедры'));

    const panel = await screen.findByRole('dialog', { name: 'Заседание кафедры' });

    expect(text(within(panel).getByText(/10:00/))).toBe('3 ноября 2026 г., 10:00–11:30');
    expect(within(panel).getByText('Не начато')).toBeInTheDocument();
    expect(within(panel).getByText('Обсуждение нагрузки на весенний семестр')).toBeInTheDocument();
    expect(within(panel).getByText('Абрамов Никита')).toBeInTheDocument();
    expect(within(panel).getByText('Андреева Ольга')).toBeInTheDocument();
    expect(within(panel).getByText('Баранов Илья')).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole('button', { name: 'Закрыть' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('событие без описания и назначенных — «Никому», без пустого описания', async () => {
    server.use(
      ...eventHandlers([
        makeEvent({
          id: 9,
          name: 'Личное дело',
          description: null,
          startedAt: at(11, 18, 9),
          endedAt: at(11, 18, 10),
          assignedUsers: [],
        }),
      ]),
    );
    renderCalendar();
    fireEvent.click(await screen.findByText('Личное дело'));

    const panel = await screen.findByRole('dialog', { name: 'Личное дело' });

    expect(within(panel).getByText('Никому')).toBeInTheDocument();
    expect(within(panel).queryByText('Описание')).not.toBeInTheDocument();
  });

  /**
   * Пустой календарь сетку не прячет: в ней будут создавать события
   * (F-60). Подсказка — над ней.
   */
  it('пустой календарь — подсказка и сетка', async () => {
    server.use(...eventHandlers([]));
    renderCalendar();

    expect(await screen.findByText('Событий пока нет')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ноябрь 2026' })).toBeInTheDocument();
  });

  it('сбой сервера — отказ и повтор', async () => {
    let fail = true;
    server.use(
      http.get(EVENTS, () =>
        fail
          ? problemResponse(500, {
              title: 'Internal Server Error',
              detail: 'Внутренняя ошибка сервера.',
              instance: '/api/events',
            })
          : undefined,
      ),
    );
    renderCalendar();

    expect(await screen.findByText('Не удалось загрузить события')).toBeInTheDocument();
    // У 5xx слова портала, а не сервера — `shared/api/problem.ts`.
    expect(screen.getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Вид календаря' })).not.toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /Повторить/ }));

    expect(await screen.findByText('Заседание кафедры')).toBeInTheDocument();
  });
});

/**
 * Правка (F-60). Мок помнит созданное и удалённое, а стандартный набор
 * один на файл — поэтому свой набор на каждый тест. Уголок тостов
 * монтируется рядом: исход сохранения и удаления сообщается им.
 */
describe('CalendarPage, правка', () => {
  const EVENT_ITEM = '*/api/events/:id';

  beforeEach(() => {
    server.use(...eventHandlers());
  });

  afterEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  function renderEditable() {
    return renderWithProviders(
      <>
        <CalendarPage />
        <ToastViewport />
      </>,
      { route: '/corp/calendar' },
    );
  }

  /** Тела запросов `method` — пропускают запрос дальше, к моку. */
  function captureBodies(method: 'post' | 'put', path: string) {
    const bodies: UserEventRequest[] = [];
    server.use(
      http[method](path, async ({ request }) => {
        bodies.push((await request.clone().json()) as UserEventRequest);
      }),
    );

    return bodies;
  }

  async function openDetails(name: string) {
    fireEvent.click(await screen.findByText(name));

    return within(await screen.findByRole('dialog', { name }));
  }

  async function openEditor(name: string) {
    const details = await openDetails(name);
    fireEvent.click(details.getByRole('button', { name: 'Изменить' }));

    return within(await screen.findByRole('dialog', { name: 'Правка события' }));
  }

  it('создаёт событие на сегодня и показывает его в сетке', async () => {
    const bodies = captureBodies('post', EVENTS);
    renderEditable();
    await screen.findByText('Заседание кафедры');

    fireEvent.click(screen.getByRole('button', { name: 'Создать событие' }));
    const form = within(await screen.findByRole('dialog', { name: 'Новое событие' }));

    expect(form.getByLabelText('Дата начала')).toHaveValue('2026-11-16');
    expect(form.getByLabelText('Время начала')).toHaveValue('09:00');
    expect(form.getByLabelText('Статус')).toHaveValue('NOT_STARTED');

    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Защита практики' } });
    // Справочник едет своим запросом — до него в списке никого нет.
    fireEvent.click(await form.findByLabelText('Андреева Ольга'));
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Событие «Защита практики» создано')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Защита практики')).toBeInTheDocument();

    expect(bodies).toEqual([
      {
        name: 'Защита практики',
        description: null,
        startedAt: at(11, 16, 9),
        endedAt: at(11, 16, 10),
        allDay: false,
        color: '#11a1fd',
        status: 'NOT_STARTED',
        // Напоминаний нет — новое событие их не обещает.
        notificationFrequency: 'NONE',
        assignedUserIds: [102],
      },
    ]);
  });

  it('новое событие на листнутом месяце — в его первое число, а не сегодня', async () => {
    renderEditable();
    await screen.findByText('Заседание кафедры');

    fireEvent.click(screen.getByRole('button', { name: 'Следующий месяц' }));
    fireEvent.click(screen.getByRole('button', { name: 'Создать событие' }));
    const form = within(await screen.findByRole('dialog', { name: 'Новое событие' }));

    expect(form.getByLabelText('Дата начала')).toHaveValue('2026-12-01');
  });

  it('«весь день» прячет время и уходит двумя полуночами, конец включительно', async () => {
    const bodies = captureBodies('post', EVENTS);
    renderEditable();
    await screen.findByText('Заседание кафедры');

    fireEvent.click(screen.getByRole('button', { name: 'Создать событие' }));
    const form = within(await screen.findByRole('dialog', { name: 'Новое событие' }));

    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Сессия' } });
    fireEvent.click(form.getByLabelText('Весь день'));

    expect(form.queryByLabelText('Время начала')).not.toBeInTheDocument();
    expect(form.queryByLabelText('Время окончания')).not.toBeInTheDocument();

    fireEvent.change(form.getByLabelText('Дата окончания'), { target: { value: '2026-11-18' } });
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    await screen.findByText('Событие «Сессия» создано');

    expect(bodies[0]).toMatchObject({
      allDay: true,
      startedAt: at(11, 16),
      endedAt: at(11, 18),
    });
  });

  it('проверяет поля до запроса: конец раньше начала', async () => {
    const bodies = captureBodies('post', EVENTS);
    renderEditable();
    await screen.findByText('Заседание кафедры');

    fireEvent.click(screen.getByRole('button', { name: 'Создать событие' }));
    const form = within(await screen.findByRole('dialog', { name: 'Новое событие' }));

    fireEvent.change(form.getByLabelText('Время окончания'), { target: { value: '08:00' } });
    fireEvent.click(form.getByRole('button', { name: 'Создать' }));

    expect(await form.findByText('Укажите название')).toBeInTheDocument();
    expect(form.getByText('Время окончания раньше времени начала')).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('открывает правку со значениями события и сохраняет её полной заменой', async () => {
    const bodies = captureBodies('put', EVENT_ITEM);
    renderEditable();

    const form = await openEditor('Методическая неделя');

    expect(form.getByLabelText('Название')).toHaveValue('Методическая неделя');
    expect(form.getByLabelText('Весь день')).toBeChecked();
    expect(form.getByLabelText('Дата начала')).toHaveValue('2026-11-10');
    expect(form.getByLabelText('Дата окончания')).toHaveValue('2026-11-12');
    expect(form.getByLabelText('Андреева Ольга')).toBeChecked();
    expect(form.getByLabelText('Учётная запись № 112')).toBeChecked();
    expect(await form.findByLabelText('Абрамов Никита')).not.toBeChecked();

    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Методическая декада' } });
    fireEvent.change(form.getByLabelText('Статус'), { target: { value: 'IN_PROGRESS' } });
    fireEvent.click(form.getByLabelText('Баранов Илья'));
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Событие «Методическая декада» сохранено')).toBeInTheDocument();
    expect(await screen.findByText('Методическая декада')).toBeInTheDocument();
    expect(screen.queryByText('Методическая неделя')).not.toBeInTheDocument();

    expect(bodies).toEqual([
      {
        name: 'Методическая декада',
        description: 'Открытые занятия и взаимопосещения',
        startedAt: at(11, 10),
        endedAt: at(11, 12),
        allDay: true,
        color: '#009688',
        status: 'IN_PROGRESS',
        // Формой не показывается, но `PUT` — полная замена: уходит пришедшее.
        notificationFrequency: 'DAILY',
        // Баранов снят, остальные — как были.
        assignedUserIds: [102, 104, 112],
      },
    ]);
  });

  it('назначенного вне справочника показывает с пометкой и сохраняет', async () => {
    server.use(
      ...eventHandlers([
        makeEvent({
          id: 9,
          name: 'Аттестация',
          startedAt: at(11, 18, 9),
          endedAt: at(11, 18, 10),
          assignedUsers: [{ id: 999, lastName: 'Сидоров', firstName: 'Сергей' }],
        }),
      ]),
    );
    const bodies = captureBodies('put', EVENT_ITEM);
    renderEditable();

    const form = await openEditor('Аттестация');
    const outside = await form.findByLabelText(/Сидоров Сергей — нет в справочнике/);

    expect(outside).toBeChecked();

    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Событие «Аттестация» сохранено');

    expect(bodies[0].assignedUserIds).toEqual([999]);
  });

  it('без справочника назначенные остаются, а новых взять неоткуда', async () => {
    server.use(
      http.get('*/api/users/directory', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/users/directory',
        }),
      ),
    );
    renderEditable();

    const form = await openEditor('Заседание кафедры');

    expect(await form.findByText(/Справочник не загрузился/)).toBeInTheDocument();
    expect(form.getByLabelText('Андреева Ольга')).toBeChecked();
    expect(form.queryByLabelText('Абрамов Никита')).not.toBeInTheDocument();
  });

  it('кладёт отказ сервера по полю под поле, а без словаря — в баннер', async () => {
    let withErrors = true;
    server.use(
      http.put(EVENT_ITEM, () =>
        withErrors
          ? problemResponse(400, {
              title: 'Bad Request',
              detail: 'Название не длиннее 200 символов',
              instance: '/api/events/2',
              errors: { name: ['Название не длиннее 200 символов'] },
            })
          : problemResponse(400, {
              title: 'Bad Request',
              detail: 'Среди назначенных есть несуществующие пользователи',
              instance: '/api/events/2',
            }),
      ),
    );
    renderEditable();

    const form = await openEditor('Заседание кафедры');
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await form.findByText('Название не длиннее 200 символов')).toBeInTheDocument();
    expect(form.queryByRole('alert')).not.toBeInTheDocument();

    withErrors = false;
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await form.findByRole('alert')).toHaveTextContent(
      'Среди назначенных есть несуществующие пользователи',
    );
  });

  it('спрашивает подтверждение, называет назначенных и удаляет', async () => {
    renderEditable();

    const details = await openDetails('Заседание кафедры');
    fireEvent.click(details.getByRole('button', { name: 'Удалить' }));

    const confirm = within(await screen.findByRole('dialog', { name: 'Удалить событие?' }));
    expect(
      confirm.getByText(
        'Событие «Заседание кафедры» будет удалено, и восстановить его нечем. Оно пропадёт и у 2 назначенных.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(confirm.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Событие «Заседание кафедры» удалено')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Соседнее событие того же дня на месте, удалённого нет.
    expect(await screen.findByText('Приём курсовых работ')).toBeInTheDocument();
    expect(screen.queryByText('Заседание кафедры')).not.toBeInTheDocument();
  });

  it('«Отмена» удаления возвращает к карточке', async () => {
    renderEditable();

    const details = await openDetails('Сдача ведомостей');
    fireEvent.click(details.getByRole('button', { name: 'Удалить' }));

    const confirm = within(await screen.findByRole('dialog', { name: 'Удалить событие?' }));
    // Без назначенных хвоста про них нет.
    expect(confirm.getByText(/будет удалено, и восстановить его нечем\.$/)).toBeInTheDocument();

    fireEvent.click(confirm.getByRole('button', { name: 'Отмена' }));

    expect(await screen.findByRole('dialog', { name: 'Сдача ведомостей' })).toBeInTheDocument();
  });

  it('удаление уже удалённого — отказ тостом, событие пропадает после перечитывания', async () => {
    renderEditable();
    const details = await openDetails('Приём курсовых работ');

    // Кто-то из назначенных успел раньше: мок его уже не знает.
    server.use(
      http.delete(EVENT_ITEM, () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Событие id=3 не найдено',
          instance: '/api/events/3',
        }),
      ),
      ...eventHandlers([]),
    );

    fireEvent.click(details.getByRole('button', { name: 'Удалить' }));
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Удалить событие?' })).getByRole('button', {
        name: 'Удалить',
      }),
    );

    expect(await screen.findByText('Событие id=3 не найдено')).toBeInTheDocument();
    expect(await screen.findByText('Событий пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
