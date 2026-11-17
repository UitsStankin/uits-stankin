import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { eventHandlers, makeEvent, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
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
