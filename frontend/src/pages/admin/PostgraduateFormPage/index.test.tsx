import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { postgraduateKeys } from '@entities/postgraduate';
import {
  makePostgraduate,
  makeTeacher,
  postgraduateHandlers,
  problemResponse,
  teacherHandlers,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { PostgraduateRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import PostgraduateFormPage from './index';

const POSTGRADUATES = '*/api/postgraduates';

/**
 * Форма записи аспирантуры: адрес → догрузка → правка → запрос.
 *
 * Через роут, а не голым рендером: «новая» и «правка» — разные адреса.
 * Рядом заглушка списка: после сохранения форма уходит туда.
 */
function renderForm(path: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/admin/postgraduates" element={<p>Список аспирантов</p>} />
        <Route path="/admin/postgraduates/new" element={<PostgraduateFormPage />} />
        <Route path="/admin/postgraduates/:id" element={<PostgraduateFormPage />} />
      </Routes>
      <ToastViewport />
    </>,
    { route: path },
  );
}

const TEACHERS = [
  makeTeacher({ id: 3, lastName: 'Баранов', firstName: 'Илья', patronymic: 'Матвеевич' }),
  makeTeacher({ id: 5, lastName: 'Волков', firstName: 'Артём', patronymic: 'Дмитриевич' }),
];

beforeEach(() => {
  server.use(
    ...postgraduateHandlers([
      makePostgraduate({
        id: 12,
        studentName: 'Абрамов Пётр Сергеевич',
        speciality: '2.3.1',
        diplomaTheme: 'Методы анализа промышленных данных',
        admissionYear: 2024,
        teacherId: 3,
        teacherName: 'Баранов Илья Матвеевич',
      }),
    ]),
    ...teacherHandlers(TEACHERS),
  );
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
});

/**
 * Перехват тела запроса записи: слушатель, а не подменённый хендлер, —
 * мок отвечает как обычно, и форма уходит к списку настоящим путём.
 */
function captureBody(method: 'POST' | 'PUT') {
  const captured: { body: PostgraduateRequest | null } = { body: null };

  server.events.on('request:start', async ({ request }) => {
    if (request.method === method && new URL(request.url).pathname.startsWith('/api/postgraduates')) {
      captured.body = (await request.clone().json()) as PostgraduateRequest;
    }
  });

  return captured;
}

afterEach(() => {
  server.events.removeAllListeners();
});

describe('PostgraduateFormPage, правка', () => {
  it('открывает запись из модераторской ручки — с группой и ФИО по частям', async () => {
    renderForm('/admin/postgraduates/12');

    expect(await screen.findByRole('textbox', { name: 'Фамилия' })).toHaveValue('Абрамов');
    expect(screen.getByRole('textbox', { name: 'Имя' })).toHaveValue('Пётр');
    expect(screen.getByRole('textbox', { name: 'Отчество' })).toHaveValue('Сергеевич');
    // Группы в публичном списке нет вовсе — она приходит только отсюда.
    expect(screen.getByRole('textbox', { name: 'Группа' })).toHaveValue('АДМ-24-01');
    expect(screen.getByRole('textbox', { name: 'Год поступления' })).toHaveValue('2024');
    expect(screen.getByRole('textbox', { name: 'Тема диссертации' })).toHaveValue(
      'Методы анализа промышленных данных',
    );

    // Руководитель встаёт, когда доезжает список преподавателей.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Научный руководитель' })).toHaveValue('3'),
    );
  });

  it('сохраняет полной заменой: с уровнем образования и пустым как null', async () => {
    const captured = captureBody('PUT');

    renderForm('/admin/postgraduates/12');

    const patronymic = await screen.findByRole('textbox', { name: 'Отчество' });
    fireEvent.change(patronymic, { target: { value: '' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Группа' }), {
      target: { value: 'АДМ-24-02' },
    });
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Научный руководитель' })).toHaveValue('3'),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Научный руководитель' }), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Список аспирантов')).toBeInTheDocument();
    expect(await screen.findByText('Запись «Абрамов Пётр» сохранена')).toBeInTheDocument();

    expect(captured.body).toEqual({
      student: {
        lastName: 'Абрамов',
        firstName: 'Пётр',
        patronymic: null,
        group: 'АДМ-24-02',
        educationLevel: 'POSTGRADUATE',
        speciality: '2.3.1',
        diplomaTheme: 'Методы анализа промышленных данных',
        admissionYear: 2024,
      },
      teacherId: null,
    });
  });

  /**
   * `PUT` — полная замена, и форма на вчерашних значениях молча откатила
   * бы чужую правку. Разбор в `usePostgraduateFormPage`.
   */
  it('берёт в форму свежий ответ, а не кэш прошлого открытия', async () => {
    const queryClient = createTestQueryClient();
    // В кэше — запись с прошлого открытия, на сервере её с тех пор поправили.
    queryClient.setQueryData(postgraduateKeys.item(12), {
      id: 12,
      student: {
        lastName: 'Абрамов',
        firstName: 'Пётр',
        patronymic: 'Сергеевич',
        group: 'УСТАРЕЛО',
        educationLevel: 'POSTGRADUATE',
        speciality: '2.3.1',
        diplomaTheme: null,
        admissionYear: 2024,
      },
      teacherId: 3,
    });

    renderWithProviders(
      <Routes>
        <Route path="/admin/postgraduates/:id" element={<PostgraduateFormPage />} />
      </Routes>,
      { route: '/admin/postgraduates/12', queryClient },
    );

    // Устаревшая группа не появляется даже на мгновение: форма ждёт ответа.
    expect(screen.queryByRole('textbox', { name: 'Группа' })).not.toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Группа' })).toHaveValue('АДМ-24-01');
  });

  it('раскладывает словарь отказа по вложенным полям', async () => {
    server.use(
      http.put(`${POSTGRADUATES}/:id`, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Ошибка валидации',
          instance: '/api/postgraduates/12',
          errors: { 'student.group': ['Группа уже занята кем-то другим'] },
        }),
      ),
    );

    renderForm('/admin/postgraduates/12');

    await screen.findByRole('textbox', { name: 'Группа' });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Группа уже занята кем-то другим')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Группа' })).toHaveAttribute('aria-invalid', 'true');
    // Всё легло под поле — баннера нет.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('показывает отказ сервиса баннером: руководителя удалили, пока форма была открыта', async () => {
    server.use(
      http.put(`${POSTGRADUATES}/:id`, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Преподаватель не найден: id=3',
          instance: '/api/postgraduates/12',
        }),
      ),
    );

    renderForm('/admin/postgraduates/12');

    await screen.findByRole('textbox', { name: 'Группа' });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Преподаватель не найден: id=3');
    expect(screen.queryByText('Список аспирантов')).not.toBeInTheDocument();
  });

  it('говорит, что записи нет, на 404 и на битый адрес', async () => {
    renderForm('/admin/postgraduates/999');
    expect(await screen.findByText('Запись не найдена')).toBeInTheDocument();
  });

  it('не ходит на сервер с нечисловым адресом', async () => {
    let requested = false;
    server.use(
      http.get(`${POSTGRADUATES}/:id`, () => {
        requested = true;
        return HttpResponse.json({});
      }),
    );

    renderForm('/admin/postgraduates/abc');

    expect(await screen.findByText('Запись не найдена')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  it('показывает сбой загрузки и повторяет запрос', async () => {
    server.use(
      http.get(`${POSTGRADUATES}/:id`, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/postgraduates/12',
        }),
      ),
    );

    renderForm('/admin/postgraduates/12');

    expect(await screen.findByText('Не удалось загрузить запись')).toBeInTheDocument();

    server.resetHandlers();
    server.use(...postgraduateHandlers([makePostgraduate({ id: 12 })]), ...teacherHandlers(TEACHERS));
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('textbox', { name: 'Фамилия' })).toHaveValue('Абрамов');
  });

  /**
   * Руководитель ушёл в архив. Подписи руководителя в записи нет — только
   * `teacherId`, — и из публичного списка пункт собрался бы как
   * «Карточка № 3». Защищённый список отдаёт архивных, и пункт
   * подписан именем с пометкой (F-53).
   */
  it('подписывает архивного руководителя именем', async () => {
    server.use(
      ...teacherHandlers([{ ...TEACHERS[0], archived: true }, TEACHERS[1]]),
    );

    renderForm('/admin/postgraduates/12');

    expect(
      await screen.findByRole('option', { name: 'Баранов Илья Матвеевич (в архиве)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Научный руководитель' })).toHaveValue('3');
    expect(screen.queryByRole('option', { name: /Карточка №/ })).not.toBeInTheDocument();
  });
});

describe('PostgraduateFormPage, новая запись', () => {
  it('проверяет поля до запроса', async () => {
    let requested = false;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') requested = true;
    });

    renderForm('/admin/postgraduates/new');

    fireEvent.click(await screen.findByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Укажите фамилию')).toBeInTheDocument();
    expect(screen.getByText('Укажите имя')).toBeInTheDocument();
    expect(screen.getByText('Укажите группу')).toBeInTheDocument();
    expect(screen.getByText('Укажите год поступления')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  it.each([
    ['24', 'Год — четыре цифры, например 2024'],
    ['1999', 'Не раньше 2000 года'],
    [String(new Date().getFullYear() + 1), 'Год поступления не может быть в будущем'],
  ])('не пропускает год %s', async (year, message) => {
    renderForm('/admin/postgraduates/new');

    fireEvent.change(await screen.findByRole('textbox', { name: 'Год поступления' }), {
      target: { value: year },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('заводит запись и уходит к списку', async () => {
    const captured = captureBody('POST');

    renderForm('/admin/postgraduates/new');

    fireEvent.change(await screen.findByRole('textbox', { name: 'Фамилия' }), {
      target: { value: 'Белова' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Имя' }), { target: { value: 'Ирина' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Группа' }), {
      target: { value: 'АДМ-25-01' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Год поступления' }), {
      target: { value: '2025' },
    });
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Научный руководитель' })).toBeEnabled(),
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Научный руководитель' }), {
      target: { value: '5' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Запись «Белова Ирина» создана')).toBeInTheDocument();
    expect(screen.getByText('Список аспирантов')).toBeInTheDocument();
    expect(captured.body).toEqual({
      student: {
        lastName: 'Белова',
        firstName: 'Ирина',
        patronymic: null,
        group: 'АДМ-25-01',
        educationLevel: 'POSTGRADUATE',
        speciality: null,
        diplomaTheme: null,
        admissionYear: 2025,
      },
      teacherId: 5,
    });
  });

  it('держит выбор руководителя запертым, пока список не доехал, и говорит о сбое', async () => {
    server.use(
      http.get('*/api/teachers', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/teachers',
        }),
      ),
    );

    renderForm('/admin/postgraduates/new');

    expect(await screen.findByText('Не удалось загрузить список преподавателей')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Научный руководитель' })).toBeDisabled();
  });
});
