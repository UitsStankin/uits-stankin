import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { scheduleKeys } from '@entities/schedule';
import { examHandlers, makeExam, problemResponse, teachersFixture } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import ExamSchedulePage from './index';

const ROUTE = '/educational-activities/schedule/schedule-exams';

/** Адрес, видимый роутеру: группа обязана оказаться в нём. */
function LocationProbe() {
  const { search } = useLocation();
  return <span data-testid="location-search">{search}</span>;
}

function renderPage(route: string = ROUTE) {
  return renderWithProviders(
    <>
      <ExamSchedulePage />
      <LocationProbe />
    </>,
    { route },
  );
}

function locationSearch(): string {
  return decodeURIComponent(screen.getByTestId('location-search').textContent ?? '');
}

function serverError(instance: string) {
  return problemResponse(500, {
    title: 'Internal Server Error',
    detail: 'Что-то пошло не так на сервере',
    instance,
  });
}

/** Названия экзаменов на странице — в порядке показа. */
function examNames(container: HTMLElement = document.body): string[] {
  return within(container)
    .getAllByRole('article')
    .map((item) => item.querySelector('p:nth-child(2)')?.textContent ?? '');
}

describe('ExamSchedulePage (F-56)', () => {
  it('сводит экзамены всех преподавателей по дням, с ссылкой на карточку', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Расписание экзаменов',
    );

    // 15 января — два экзамена у разных преподавателей: утренний первым.
    const day = await screen.findByRole('region', { name: 'Пятница, 15 января 2027 г.' });
    expect(examNames(day)).toEqual([
      'Системы реального времени',
      'Технические средства информационных систем',
    ]);
    expect(within(day).getByRole('link', { name: 'Андреева Ольга Викторовна' })).toHaveAttribute(
      'href',
      '/about/employee/teachers/2',
    );

    // Дни идут по датам, а не по преподавателям, как устроен ответ.
    expect(
      screen.getAllByRole('region').map((region) => region.getAttribute('aria-label')),
    ).toEqual([
      'Понедельник, 11 января 2027 г.',
      'Пятница, 15 января 2027 г.',
      'Вторник, 19 января 2027 г.',
    ]);
  });

  it('в выборе групп поток разложен на коды по одному', async () => {
    renderPage();

    const select = await screen.findByRole('combobox', { name: 'Группа' });
    await waitFor(() => {
      expect(
        within(select)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['Все группы', 'ИДБ-23-01', 'ИДБ-23-02', 'ИДМ-25-01']);
    });
  });

  it('выбор группы кладёт её в адрес и отбирает на сервере', async () => {
    const seen: string[] = [];
    server.use(
      http.get('*/api/public/exams', ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('group') ?? '');
        return undefined;
      }),
    );

    renderPage();

    const select = await screen.findByRole('combobox', { name: 'Группа' });
    await screen.findByRole('option', { name: 'ИДБ-23-02' });
    fireEvent.change(select, { target: { value: 'ИДБ-23-02' } });

    expect(locationSearch()).toBe('?group=ИДБ-23-02');
    // Экзамен потока «ИДБ-23-01, ИДБ-23-02» найден по одному коду — это
    // правило сравнения бэкенда, мок его повторяет; фронт не отбирает сам.
    await waitFor(() => {
      expect(examNames()).toEqual(['Архитектура ЭВМ', 'Базы данных']);
    });
    expect(seen).toContain('ИДБ-23-02');
  });

  it('группа из адреса выбрана сразу, и «Все группы» возвращает всех', async () => {
    renderPage(`${ROUTE}?group=ИДМ-25-01`);

    await waitFor(() => {
      expect(examNames()).toEqual(['Системы реального времени']);
    });
    expect(screen.getByRole('combobox', { name: 'Группа' })).toHaveValue('ИДМ-25-01');

    fireEvent.change(screen.getByRole('combobox', { name: 'Группа' }), {
      target: { value: '' },
    });

    expect(locationSearch()).toBe('');
    await waitFor(() => {
      expect(examNames()).toHaveLength(4);
    });
  });

  it('группа без экзаменов — «не найдено» с выходом ко всем, а выбор её помнит', async () => {
    renderPage(`${ROUTE}?group=ИДБ-99-99`);

    expect(await screen.findByText('Экзаменов не найдено')).toBeInTheDocument();
    expect(screen.getByText(/У группы ИДБ-99-99 экзаменов/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Показать все группы' })).toHaveAttribute(
      'href',
      ROUTE,
    );
    // Группы нет в списке, но в выборе она стоит: иначе над пустой выдачей
    // висело бы «Все группы».
    expect(screen.getByRole('combobox', { name: 'Группа' })).toHaveValue('ИДБ-99-99');
  });

  it('пустая сессия при PDF в карточках — отсылает к ним', async () => {
    server.use(
      // Ссылки на PDF — из карточек фикстуры, они там есть у троих.
      ...examHandlers({}),
    );

    renderPage();

    expect(await screen.findByText('Расписание экзаменов пока не загружено')).toBeInTheDocument();
    expect(
      await screen.findByText('Ниже — расписания в PDF из карточек преподавателей.'),
    ).toBeInTheDocument();
    // Выбирать не из чего — выбора нет.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('пусто всё — без отсылки к PDF и без раздела PDF', async () => {
    server.use(
      ...examHandlers(
        {},
        teachersFixture.map((teacher) => ({
          ...teacher,
          examScheduleGraduation: null,
          examScheduleNonGraduation: null,
        })),
      ),
    );

    const { queryClient } = renderPage();

    expect(
      await screen.findByText('Оно появится здесь, как только его загрузят.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(queryClient.getQueryState(scheduleKeys.examFiles())?.status).toBe('success');
    });
    expect(screen.queryByText('Расписания в PDF')).not.toBeInTheDocument();
  });

  it('PDF из карточек — двумя списками, невыпускные первыми, в новой вкладке', async () => {
    renderPage();

    const section = (await screen.findByRole('heading', { name: 'Расписания в PDF' })).closest(
      'section',
    )!;
    const lists = within(section).getAllByRole('heading', { level: 3 });
    expect(lists.map((heading) => heading.textContent)).toEqual([
      'Невыпускные курсы',
      'Выпускные курсы',
    ]);

    const nonGraduation = lists[0].closest('section')!;
    expect(
      within(nonGraduation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Андреева Ольга Викторовна', 'Белова Екатерина Андреевна']);

    const graduation = within(lists[1].closest('section')!).getByRole('link', {
      name: 'Абрамов Никита Сергеевич',
    });
    expect(graduation).toHaveAttribute(
      'href',
      'https://stankin.ru/uploads/exams/abramov-graduation.pdf',
    );
    expect(graduation).toHaveAttribute('target', '_blank');
  });

  it('сбой сводной — ошибка с повтором, а PDF из карточек на месте', async () => {
    server.use(http.get('*/api/public/exams', () => serverError('/api/public/exams')));

    renderPage();

    expect(
      await screen.findByText('Не удалось загрузить расписание экзаменов'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Расписания в PDF' })).toBeInTheDocument();
  });

  it('сбой ссылок на PDF не гасит экзамены', async () => {
    server.use(http.get('*/api/public/exams/files', () => serverError('/api/public/exams/files')));

    renderPage();

    expect(await screen.findByText('Не удалось загрузить ссылки на PDF')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Пятница, 15 января 2027 г.' })).toBeInTheDocument();
  });

  it('экзамен потока стоит в дне один раз, с полным списком групп', async () => {
    server.use(
      ...examHandlers({
        1: [makeExam({ id: 1, group: 'ИДБ-23-01, ИДБ-23-02', cabinet: '209' })],
      }),
    );

    renderPage(`${ROUTE}?group=ИДБ-23-01`);

    await waitFor(() => {
      expect(examNames()).toHaveLength(1);
    });
    expect(screen.getByText('ИДБ-23-01, ИДБ-23-02 · ауд. 209')).toBeInTheDocument();
  });
});
