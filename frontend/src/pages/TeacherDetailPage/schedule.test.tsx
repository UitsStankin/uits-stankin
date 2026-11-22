import { act, fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { examHandlers, makeLesson, problemResponse, scheduleHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import TeacherDetailPage from './index';

function renderCard(id: number) {
  return renderWithProviders(
    <Routes>
      <Route path="/about/employee/teachers/:id" element={<TeacherDetailPage />} />
    </Routes>,
    { route: `/about/employee/teachers/${String(id)}` },
  );
}

/**
 * Сегодняшний день подменяется только у `Date`: таймеры остаются
 * настоящими, иначе встали бы и ретраи запросов, и `findBy`.
 */
function setToday(year: number, month: number, day: number) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(year, month - 1, day, 12, 0));
}

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Пары первого преподавателя фикстуры (Абрамова) — в духе демо-карточки
 * стенда: лабораторная двумя подгруппами через неделю по очереди,
 * лекция потоку без аудитории и разовая консультация.
 *
 * Весна 2026: 16 марта — понедельник. Подгруппа Б — недели 16.03, 30.03,
 * 13.04, 27.04; подгруппа А — 23.03, 06.04, 20.04, 04.05.
 */
const SPRING_LESSONS = [
  makeLesson({
    id: 233,
    weekNumber: 1,
    classTime: 1,
    group: 'ИДБ-25-11',
    name: 'Технические средства информационных систем',
    type: 'Лабораторная',
    subgroup: 'Б',
    cabinet: '216',
    dates: [{ id: 1, startDate: '16.03', endDate: '27.04', alternativelyPeriod: true }],
  }),
  makeLesson({
    id: 234,
    weekNumber: 1,
    classTime: 1,
    group: 'ИДБ-25-11',
    name: 'Технические средства информационных систем',
    type: 'Лабораторная',
    subgroup: 'А',
    cabinet: '216',
    dates: [{ id: 2, startDate: '23.03', endDate: '04.05', alternativelyPeriod: true }],
  }),
  makeLesson({
    id: 235,
    weekNumber: 2,
    classTime: 3,
    group: 'ИДБ-25-11, ИДБ-25-12',
    name: 'Архитектура ЭВМ',
    type: 'Лекция',
    subgroup: null,
    cabinet: null,
    dates: [{ id: 3, startDate: '17.03', endDate: '05.05', alternativelyPeriod: false }],
  }),
];

describe('TeacherDetailPage — расписание пар (F-55)', () => {
  beforeEach(() => {
    // Экзамены — соседний блок с днями тех же названий («Понедельник, …»);
    // здесь проверяются пары, и чужие дни сбивали бы поиск по региону.
    server.use(...scheduleHandlers({ 1: SPRING_LESSONS }), ...examHandlers({}));
  });

  it('показывает текущую неделю: пары по дням, сегодняшний день отмечен', async () => {
    setToday(2026, 3, 18);

    renderCard(1);

    expect(await screen.findByRole('heading', { name: 'Расписание занятий' })).toBeInTheDocument();
    expect(screen.getByText('16–21 марта 2026 г.')).toBeInTheDocument();

    const monday = screen.getByRole('region', { name: 'Понедельник, 16 марта' });
    expect(within(monday).getByText('Технические средства информационных систем')).toBeInTheDocument();
    expect(within(monday).getByText('8:30–10:10')).toBeInTheDocument();
    expect(within(monday).getByText(/ИДБ-25-11, подгруппа Б/)).toHaveTextContent(
      'ИДБ-25-11, подгруппа Б · ауд. 216',
    );
    // Подгруппа А в эту неделю не занимается.
    expect(within(monday).queryByText(/подгруппа А/)).not.toBeInTheDocument();

    // Аудитории нет — нет и подписи «ауд.».
    const tuesday = screen.getByRole('region', { name: 'Вторник, 17 марта' });
    expect(within(tuesday).getByText('ИДБ-25-11, ИДБ-25-12')).toBeInTheDocument();
    expect(within(tuesday).queryByText(/ауд\./)).not.toBeInTheDocument();

    const wednesday = screen.getByRole('region', { name: 'Среда, 18 марта' });
    expect(wednesday).toHaveAttribute('aria-current', 'date');
    expect(within(wednesday).getByText('Пар нет')).toBeInTheDocument();
    expect(monday).not.toHaveAttribute('aria-current');
  });

  /**
   * Воскресенья в сетке нет: в воскресенье блок открывает завтрашнюю
   * неделю, а не прошедшую, где сегодняшнего дня даже не видно.
   */
  it('в воскресенье открывает следующую неделю', async () => {
    setToday(2026, 3, 22);

    renderCard(1);

    expect(await screen.findByText('23–28 марта 2026 г.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Текущая неделя' })).toBeDisabled();
  });

  it('листает недели без новых запросов и возвращается к текущей', async () => {
    setToday(2026, 3, 18);
    let requests = 0;
    server.events.on('request:start', ({ request }) => {
      if (request.url.endsWith('/schedule')) requests += 1;
    });

    renderCard(1);

    const current = await screen.findByRole('button', { name: 'Текущая неделя' });
    expect(current).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Следующая' }));

    expect(screen.getByText('23–28 марта 2026 г.')).toBeInTheDocument();
    const monday = screen.getByRole('region', { name: 'Понедельник, 23 марта' });
    expect(within(monday).getByText(/подгруппа А/)).toBeInTheDocument();
    expect(within(monday).queryByText(/подгруппа Б/)).not.toBeInTheDocument();
    expect(current).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Предыдущая' }));
    fireEvent.click(screen.getByRole('button', { name: 'Предыдущая' }));
    expect(screen.getByText('9–14 марта 2026 г.')).toBeInTheDocument();

    fireEvent.click(current);
    expect(screen.getByText('16–21 марта 2026 г.')).toBeInTheDocument();
    expect(current).toBeDisabled();

    expect(requests).toBe(1);
  });

  /**
   * Клики быстрее перерисовки: каждый обязан дать свой шаг, а не
   * пересчитать сдвиг от недели, которую ещё показывает экран.
   */
  it('не теряет быстрые клики листания', async () => {
    setToday(2026, 3, 18);

    renderCard(1);

    const next = await screen.findByRole('button', { name: 'Следующая' });
    act(() => {
      next.click();
      next.click();
      next.click();
    });

    expect(screen.getByText('6–11 апреля 2026 г.')).toBeInTheDocument();
  });

  /**
   * Весеннее расписание, открытое осенью, — то, что на стенде увидит
   * любой посетитель демо-карточки. Пустая сетка сказала бы «пар нет»;
   * блок называет последнюю неделю с парами и ведёт к ней.
   */
  it('на пустой неделе после семестра называет последнюю неделю с парами', async () => {
    setToday(2026, 11, 18);

    renderCard(1);

    expect(
      await screen.findByText(/На этой неделе пар нет\. Последние были — 4–9 мая 2026 г\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Понедельник/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Показать эту неделю' }));

    expect(screen.getByText('4–9 мая 2026 г.')).toBeInTheDocument();
    const monday = screen.getByRole('region', { name: 'Понедельник, 4 мая' });
    expect(within(monday).getByText(/подгруппа А/)).toBeInTheDocument();
    expect(screen.queryByText(/На этой неделе пар нет/)).not.toBeInTheDocument();
  });

  it('до начала семестра называет ближайшую неделю с парами', async () => {
    setToday(2026, 1, 14);

    renderCard(1);

    expect(
      await screen.findByText(/На этой неделе пар нет\. Ближайшие — 16–21 марта 2026 г\./),
    ).toBeInTheDocument();
  });

  /**
   * Расписание загружено не у всех: ручка отвечает `200` с пустым
   * `lessons`. «Расписание не загружено» под половиной карточек посетителю
   * ничего не говорит — блока нет вовсе.
   */
  it('без расписания не рисует блок', async () => {
    server.use(...scheduleHandlers({}));

    renderCard(1);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Абрамов Никита Сергеевич' }),
    ).toBeInTheDocument();
    // Ответ расписания мог прийти позже карточки — ждём, пока запросы
    // осядут, иначе проверка отсутствия ничего не проверяет.
    await screen.findByText('Достижения преподавателя');
    expect(screen.queryByText('Расписание занятий')).not.toBeInTheDocument();
  });

  it('на сбое расписания показывает сбой блока, не трогая карточку', async () => {
    server.use(
      http.get('*/api/public/teachers/:id/schedule', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/public/teachers/1/schedule',
        }),
      ),
    );

    renderCard(1);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить расписание')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Абрамов Никита Сергеевич' }),
    ).toBeInTheDocument();
  });

  /**
   * На несуществующем преподавателе ручка расписания отвечает `404` —
   * то же, что уже сказала карточка. Блок молчит, а не повторяет это сбоем.
   */
  it('на несуществующем преподавателе не рисует блок и не показывает сбой', async () => {
    renderCard(9000);

    expect(await screen.findByText('Преподаватель не найден')).toBeInTheDocument();
    expect(screen.queryByText('Расписание занятий')).not.toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить расписание')).not.toBeInTheDocument();
  });
});
