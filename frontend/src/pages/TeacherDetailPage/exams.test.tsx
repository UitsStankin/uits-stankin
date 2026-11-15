import { screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { scheduleKeys } from '@entities/schedule';
import {
  examHandlers,
  makeExam,
  makeTeacher,
  problemResponse,
  teacherHandlers,
} from '@shared/api/mocks';
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

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Два экзамена в один день у разных групп и третий — через четыре дня,
 * без консультации. Ответ нарочно не по порядку: раскладывать по дням
 * и времени обязан фронт, а не случай.
 */
const SESSION = [
  makeExam({
    id: 12,
    date: '2025-05-15',
    timeStart: '16:00',
    timeEnd: '21:10',
    group: 'ИДБ-21-11',
    name: 'Применение методов машинного обучения',
    cabinet: '308',
    consultation: { date: '2025-05-14', time: '16:00', cabinet: '308' },
  }),
  makeExam({
    id: 13,
    date: '2025-05-15',
    timeStart: '08:30',
    timeEnd: '14:00',
    group: 'ИДБ-21-09',
    name: 'Системы интеллектуального анализа данных',
    cabinet: '0402',
    consultation: null,
  }),
  makeExam({
    id: 14,
    date: '2025-05-19',
    group: 'ИДБ-21-09, ИДБ-21-10',
    name: 'Базы данных',
    cabinet: '209',
  }),
];

/** Блок экзаменов — секция с заголовком второго уровня. */
async function findExamsBlock() {
  const heading = await screen.findByRole('heading', { level: 2, name: 'Расписание экзаменов' });
  return heading.closest('section')!;
}

describe('TeacherDetailPage — экзамены (F-56)', () => {
  it('раскладывает экзамены по дням и времени, с консультацией', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2025, 4, 15, 12, 0));
    server.use(...examHandlers({ 1: SESSION }));

    renderCard(1);

    const block = await findExamsBlock();
    const day = await within(block).findByRole('region', { name: 'Четверг, 15 мая 2025 г.' });

    // Сегодняшний день отмечен — так же, как в расписании пар.
    expect(day).toHaveAttribute('aria-current', 'date');
    expect(within(day).getByText('сегодня')).toBeInTheDocument();

    // Утренний экзамен выше вечернего, хотя в ответе он второй.
    const names = within(day)
      .getAllByRole('article')
      .map((item) => item.querySelector('p:nth-child(2)')?.textContent);
    expect(names).toEqual([
      'Системы интеллектуального анализа данных',
      'Применение методов машинного обучения',
    ]);

    expect(within(day).getByText('ИДБ-21-11 · ауд. 308')).toBeInTheDocument();
    expect(within(day).getByText('Консультация — 14 мая, 16:00, ауд. 308')).toBeInTheDocument();
    // У экзамена без консультации строки нет вовсе, а не «Консультация — …».
    expect(within(day).getAllByText(/Консультация/)).toHaveLength(1);

    // Имя преподавателя на его же карточке не повторяется у каждого экзамена.
    expect(within(block).queryByRole('link', { name: /Абрамов/ })).not.toBeInTheDocument();

    const later = within(block).getByRole('region', { name: 'Понедельник, 19 мая 2025 г.' });
    expect(later).not.toHaveAttribute('aria-current');
    expect(within(later).getByText('ИДБ-21-09, ИДБ-21-10 · ауд. 209')).toBeInTheDocument();
  });

  it('без экзаменов и без PDF блока нет', async () => {
    server.use(...teacherHandlers([makeTeacher({ id: 1 })]), ...examHandlers({}));

    const { queryClient } = renderCard(1);

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    // Пустой ответ рисует тот же кадр, что и его отсутствие, и ждать на экране
    // нечего: без ожидания ответа проверка прошла бы и со сломанным блоком.
    await waitFor(() => {
      expect(queryClient.getQueryState(scheduleKeys.teacherExams(1))?.status).toBe('success');
    });
    expect(screen.queryByText('Расписание экзаменов')).not.toBeInTheDocument();
  });

  it('только PDF из карточки — блок со ссылками без дней', async () => {
    server.use(
      ...teacherHandlers([
        makeTeacher({
          id: 1,
          examScheduleNonGraduation: 'https://stankin.ru/uploads/exams.pdf',
        }),
      ]),
      ...examHandlers({}),
    );

    renderCard(1);

    const block = await findExamsBlock();
    expect(within(block).getByRole('link', { name: 'Невыпускные курсы (PDF)' })).toHaveAttribute(
      'href',
      'https://stankin.ru/uploads/exams.pdf',
    );
    expect(within(block).queryByRole('region')).not.toBeInTheDocument();
  });

  it('сбой запроса экзаменов не гасит ссылки на PDF — они пришли с карточкой', async () => {
    server.use(
      ...teacherHandlers([
        makeTeacher({ id: 1, examScheduleGraduation: 'https://stankin.ru/uploads/g.pdf' }),
      ]),
      http.get('*/api/public/teachers/:id/exams', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/public/teachers/1/exams',
        }),
      ),
    );

    renderCard(1);

    const block = await findExamsBlock();
    expect(await within(block).findByText('Не удалось загрузить экзамены')).toBeInTheDocument();
    expect(within(block).getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
    expect(within(block).getByRole('link', { name: 'Выпускные курсы (PDF)' })).toBeInTheDocument();
  });

  it('на несуществующем преподавателе блок молчит — «не найден» уже сказала карточка', async () => {
    renderCard(999);

    expect(await screen.findByText('Преподаватель не найден')).toBeInTheDocument();
    expect(screen.queryByText('Не удалось загрузить экзамены')).not.toBeInTheDocument();
  });
});
