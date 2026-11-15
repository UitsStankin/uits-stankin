import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { examHandlers, problemResponse, scheduleHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import { ScheduleImport } from './ScheduleImport';
import { MAX_IMPORT_BYTES } from './lib/importText';

const SCHEDULE_IMPORT = '*/api/teachers/:id/schedule/import';
const EXAMS_IMPORT = '*/api/teachers/:id/exams/import';

/**
 * Импорт PDF расписаний: выбор файла → окно → запрос → итог строкой.
 *
 * Первый преподаватель фикстуры (Абрамов): у него пять пар и два экзамена,
 * то есть окно обязано назвать, что пропадёт. Мок импорта заменяет пары
 * двенадцатью, экзамены — тремя, и чтение после импорта отдаёт уже их.
 */
function renderImport() {
  return renderWithProviders(<ScheduleImport teacherId={1} />);
}

/**
 * Содержимое файла мок не видит — jsdom отдаёт его в теле строкой
 * `undefined` (разбор в `shared/api/mocks/importPdf.ts`); важны имя
 * и непустота, их проверяет форма.
 */
function pdf(name = 'весна.pdf') {
  return new File(['%PDF-1.7'], name, { type: 'application/pdf' });
}

function choose(label: RegExp, file: File) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
}

/** Считает запросы импорта: «ничего не ушло» иначе не проверить. */
function countImports() {
  const calls: string[] = [];
  server.events.on('request:start', ({ request }) => {
    if (request.method === 'POST' && request.url.includes('/import')) calls.push(request.url);
  });
  return calls;
}

/*
 * Свежий набор на каждый тест: мок импорта помнит замену (иначе чтение
 * после неё не изменилось бы), а стандартный набор создаётся один раз
 * на файл — и пары, заменённые одним тестом, достались бы следующему.
 */
beforeEach(() => {
  server.use(...scheduleHandlers(), ...examHandlers());
});

describe('ScheduleImport', () => {
  it('показывает, что загружено сейчас', async () => {
    renderImport();

    expect(await screen.findByText('Сейчас загружено: 5 занятий.')).toBeInTheDocument();
    expect(await screen.findByText('Сейчас загружено: 2 экзамена.')).toBeInTheDocument();
  });

  it('говорит «не загружено» у пустого расписания', async () => {
    server.use(...scheduleHandlers({}), ...examHandlers({}));
    renderImport();

    expect(await screen.findAllByText('Сейчас не загружено.')).toHaveLength(2);
  });

  it('спрашивает, называя, что пропадёт и из какого файла', async () => {
    renderImport();
    await screen.findByText('Сейчас загружено: 5 занятий.');

    choose(/Расписание пар: загрузить PDF/, pdf());

    const dialog = await screen.findByRole('dialog', { name: 'Заменить расписание пар?' });
    expect(dialog).toHaveTextContent(
      'Текущее расписание пар (5 занятий) будет удалено и заменено разобранным из файла «весна.pdf».',
    );
  });

  it('заменяет пары и перечитывает текущее', async () => {
    renderImport();
    await screen.findByText('Сейчас загружено: 5 занятий.');

    choose(/Расписание пар: загрузить PDF/, pdf());
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Загружено из «весна.pdf»: 12 занятий.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText('Сейчас загружено: 12 занятий.')).toBeInTheDocument();
    // Экзамены — независимые данные, импорт пар их не трогает.
    expect(screen.getByText('Сейчас загружено: 2 экзамена.')).toBeInTheDocument();
  });

  it('заменяет экзамены своей ручкой', async () => {
    renderImport();
    await screen.findByText('Сейчас загружено: 2 экзамена.');

    choose(/Расписание экзаменов: загрузить PDF/, pdf('сессия.pdf'));
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Заменить расписание экзаменов?' })).getByRole(
        'button',
        { name: 'Заменить' },
      ),
    );

    expect(await screen.findByText('Сейчас загружено: 3 экзамена.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Загружено из «сессия.pdf»: 3 экзамена.');
  });

  it('ничего не шлёт, если замену отменили', async () => {
    const calls = countImports();
    renderImport();
    await screen.findByText('Сейчас загружено: 5 занятий.');

    choose(/Расписание пар: загрузить PDF/, pdf());
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Отмена' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toHaveLength(0);
    expect(screen.getByText('Сейчас загружено: 5 занятий.')).toBeInTheDocument();
  });

  it('отклоняет файл больше 5 МБ до окна и до запроса', async () => {
    const calls = countImports();
    renderImport();
    await screen.findByText('Сейчас загружено: 5 занятий.');

    const big = new File([new Uint8Array(MAX_IMPORT_BYTES + 1)], 'скан.pdf', {
      type: 'application/pdf',
    });
    choose(/Расписание пар: загрузить PDF/, big);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Файл «скан.pdf» больше 5 МБ — такой сервер не примет.',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('показывает причину 400 словами сервера и обещает, что прежнее цело', async () => {
    server.use(
      http.post(SCHEDULE_IMPORT, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Не удалось разобрать файл: в PDF не найдено ни одной таблицы расписания',
          instance: '/api/teachers/1/schedule/import',
        }),
      ),
    );
    renderImport();
    await screen.findByText('Сейчас загружено: 5 занятий.');

    choose(/Расписание пар: загрузить PDF/, pdf('экзамены.pdf'));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Файл не принят: Не удалось разобрать файл: в PDF не найдено ни одной таблицы расписания. Расписание пар осталось прежним.',
    );
    expect(screen.getByText('Сейчас загружено: 5 занятий.')).toBeInTheDocument();
  });

  it('отличает лёгший сервис разбора от плохого файла', async () => {
    server.use(
      http.post(SCHEDULE_IMPORT, () =>
        problemResponse(503, {
          title: 'Service Unavailable',
          detail: 'schedule-service: read timed out',
          instance: '/api/teachers/1/schedule/import',
        }),
      ),
    );
    renderImport();
    await screen.findByText('Сейчас загружено: 5 занятий.');

    choose(/Расписание пар: загрузить PDF/, pdf());
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('дело не в файле');
    expect(alert).not.toHaveTextContent('read timed out');
  });

  it('просит подождать, когда расписание импортирует кто-то ещё', async () => {
    server.use(
      http.post(EXAMS_IMPORT, () =>
        problemResponse(409, {
          title: 'Conflict',
          detail: 'Импорт уже идёт',
          instance: '/api/teachers/1/exams/import',
        }),
      ),
    );
    renderImport();
    await screen.findByText('Сейчас загружено: 2 экзамена.');

    choose(/Расписание экзаменов: загрузить PDF/, pdf());
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Заменить' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Это расписание прямо сейчас загружает кто-то ещё. Подождите и повторите. Расписание экзаменов осталось прежним.',
    );
  });

  it('оговаривается в окне, когда текущее прочитать не удалось', async () => {
    server.use(
      http.get('*/api/public/teachers/:id/schedule', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'boom',
          instance: '/api/public/teachers/1/schedule',
        }),
      ),
    );
    renderImport();

    expect(
      await screen.findByText('Не удалось узнать, что загружено сейчас.'),
    ).toBeInTheDocument();

    choose(/Расписание пар: загрузить PDF/, pdf());
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Текущее расписание пар, если оно загружено, будет удалено',
    );
  });
});
