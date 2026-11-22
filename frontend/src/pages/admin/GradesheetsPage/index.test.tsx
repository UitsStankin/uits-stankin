import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { gradesheetHandlers, makeGradesheet } from '@shared/api/mocks/gradesheets';
import { problemResponse } from '@shared/api/mocks/problemResponse';
import { server } from '@shared/api/mocks/server';
import { ADMIN_GRADESHEETS_ROUTE, adminGradesheetRoute } from '@shared/config/routes';
import GradesheetsPage, { GradesheetPage } from './index';

function renderAt(route = ADMIN_GRADESHEETS_ROUTE) {
  return renderWithProviders(
    <Routes>
      <Route path={ADMIN_GRADESHEETS_ROUTE} element={<GradesheetsPage />} />
      <Route path={`${ADMIN_GRADESHEETS_ROUTE}/:id`} element={<GradesheetPage />} />
    </Routes>, { route },
  );
}

function selectWorkbook(name = 'ведомости.xlsx') {
  fireEvent.change(screen.getByLabelText(/Книга Excel/), {
    target: { files: [new File(['workbook'], name)] },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Загрузить книгу' }));
}

describe('Ведомости', () => {
  it('применяет фильтры вместе и сбрасывает запредельную страницу', async () => {
    server.use(...gradesheetHandlers([
      makeGradesheet(),
      makeGradesheet({ id: 2, group: 'ИДБ-25-15' }),
      makeGradesheet({ id: 3, semester: 'Другой семестр' }),
      makeGradesheet({ id: 4, discipline: 'Математика' }),
    ]));
    renderAt(`${ADMIN_GRADESHEETS_ROUTE}?page=3`);
    expect(await screen.findByText('На этой странице нет ведомостей.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Дисциплина'), { target: { value: 'базы' } });
    fireEvent.change(screen.getByLabelText('Группа'), { target: { value: 'идб-25-11' } });
    fireEvent.change(screen.getByLabelText('Семестр'), { target: { value: makeGradesheet().semester } });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));
    expect(await screen.findByRole('link', { name: 'Базы данных · ИДБ-25-11' }))
      .toHaveAttribute('href', adminGradesheetRoute(1));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it('даёт повторить запрос после 500 и показывает пустой список', async () => {
    server.use(
      http.get('*/api/gradesheets', () => problemResponse(500, {
        title: 'Internal Server Error', detail: 'Ошибка чтения', instance: '/api/gradesheets',
      }), { once: true }),
      ...gradesheetHandlers([]),
    );
    renderAt();
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Ведомости не найдены.')).toBeInTheDocument();
  });

  it('показывает предупреждения конкретного листа и обновляет список после импорта', async () => {
    server.use(...gradesheetHandlers([]));
    renderAt();
    await screen.findByText('Ведомости не найдены.');
    selectWorkbook('ведомости.pdf');
    expect(screen.getByRole('alert')).toHaveTextContent('.xlsx');
    selectWorkbook();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('заменит состав студентов и оценки');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Импортировать' }));
    const warning = await screen.findByText('Преподаватель не найден в справочнике ППС.');
    expect(warning.closest('ul')?.parentElement).toHaveTextContent('Лист «ИДБ-25-15»');
    expect(screen.getByRole('link', { name: 'Базы данных · ИДБ-25-15' })).toBeInTheDocument();
  });

  it('показывает причину отказа сервиса разбора и позволяет повторить импорт', async () => {
    server.use(
      http.post('*/api/gradesheets/import', () => problemResponse(503, {
        title: 'Service Unavailable', detail: 'Сервис разбора недоступен.', instance: '/api/gradesheets/import',
      }), { once: true }),
      ...gradesheetHandlers([]),
    );
    renderAt();
    await screen.findByText('Ведомости не найдены.');
    selectWorkbook();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Импортировать' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Сервис разбора ведомостей недоступен.');
    selectWorkbook();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Импортировать' }));
    expect(await screen.findByText('Импортировано ведомостей: 2')).toBeInTheDocument();
  });

  it('показывает пустой блок, нулевой балл и текстовую отметку, затем удаляет ведомость', async () => {
    server.use(...gradesheetHandlers());
    renderAt(adminGradesheetRoute(1));
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent))
      .toEqual(['№', 'Студент', 'М1', 'М2', 'Зачёт']);
    expect(within(table).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual(['1', '0', '—', 'не допущен']);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить ведомость' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }));
    expect(await screen.findByText('Ведомости не найдены.')).toBeInTheDocument();
  });

  it('показывает 404 для удалённой или неизвестной ведомости', async () => {
    renderAt(adminGradesheetRoute(99));
    expect(await screen.findByRole('heading', { name: 'Ведомость не найдена' })).toBeInTheDocument();
  });
});
