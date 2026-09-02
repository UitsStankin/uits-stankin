import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { makeTeacher, problemResponse, publicTeacherHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import TeacherDetailPage from './index';

const TEACHER_URL = '*/api/public/teachers/:id';

/**
 * Страница проверяется через роут, а не голым рендером: `id` она берёт
 * из адреса через `useParams`, а он пуст, пока адрес не сопоставлен
 * с шаблоном пути.
 */
function renderCard(id: number | string) {
  return renderWithProviders(
    <Routes>
      <Route path="/about/employee/teachers/:id" element={<TeacherDetailPage />} />
    </Routes>,
    { route: `/about/employee/teachers/${String(id)}` },
  );
}

afterEach(() => {
  onlineManager.setOnline(true);
});

/**
 * Карточка преподавателя: адрес → запрос → разметка.
 *
 * Первая карточка фикстуры — Абрамов Никита Сергеевич, доцент кафедры,
 * кандидат технических наук, с фотографией и без дисциплин
 * (`shared/api/mocks/teachers.ts`); всё остальное задаётся точечно.
 */
describe('TeacherDetailPage', () => {
  it('показывает скелет, потом карточку', async () => {
    renderCard(1);

    expect(screen.getByText('Загрузка карточки преподавателя')).toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Абрамов Никита Сергеевич' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('доцент кафедры, кандидат технических наук, доцент'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Загрузка карточки преподавателя')).not.toBeInTheDocument();
  });

  it('показывает контакты ссылками, а мессенджер — текстом', async () => {
    server.use(
      ...publicTeacherHandlers([
        makeTeacher({
          id: 1,
          email: 'm.ivanova@stankin.ru',
          phoneNumber: '+7 (499) 972-95-84',
          messenger: '@m_ivanova',
        }),
      ]),
    );

    renderCard(1);

    expect(await screen.findByRole('link', { name: 'm.ivanova@stankin.ru' })).toHaveAttribute(
      'href',
      'mailto:m.ivanova@stankin.ru',
    );
    expect(screen.getByRole('link', { name: '+7 (499) 972-95-84' })).toHaveAttribute(
      'href',
      'tel:+7 (499) 972-95-84',
    );

    // Мессенджер — имя пользователя, а не адрес: ссылка из него вела бы
    // в никуда, как в оригинале.
    expect(screen.getByText('@m_ivanova')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '@m_ivanova' })).not.toBeInTheDocument();
  });

  /**
   * `education` и `qualification` — rich-text: сервер чистит их при
   * сохранении, и разметка обязана доехать до экрана разметкой, а не
   * строкой с тегами.
   */
  it('рисует образование разметкой, а биографию текстом', async () => {
    server.use(
      ...publicTeacherHandlers([
        makeTeacher({
          id: 1,
          education: '<ul><li>МГТУ «СТАНКИН», 2005</li></ul>',
          bio: 'Ведёт лабораторию с 2010 года.',
        }),
      ]),
    );

    renderCard(1);

    const education = await screen.findByText('МГТУ «СТАНКИН», 2005');
    expect(education.tagName).toBe('LI');
    expect(screen.getByText('Ведёт лабораторию с 2010 года.')).toBeInTheDocument();
  });

  it('показывает дисциплины и ссылки на расписание экзаменов', async () => {
    server.use(
      ...publicTeacherHandlers([
        makeTeacher({
          id: 1,
          subjects: [{ id: 1, name: 'Базы данных', description: 'Реляционная модель, SQL' }],
          examScheduleGraduation: 'https://stankin.ru/uploads/exams-graduation.pdf',
        }),
      ]),
    );

    renderCard(1);

    expect(await screen.findByText('Базы данных')).toBeInTheDocument();
    expect(screen.getByText('Реляционная модель, SQL')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Выпускные курсы' });
    expect(link).toHaveAttribute('href', 'https://stankin.ru/uploads/exams-graduation.pdf');
    expect(link).toHaveAttribute('target', '_blank');

    // Второй ссылки нет: невыпускные курсы в этой карточке не заполнены,
    // и пустого пункта на её месте быть не должно.
    expect(screen.queryByRole('link', { name: 'Невыпускные курсы' })).not.toBeInTheDocument();
  });

  /**
   * Обязательны только фамилия, имя и должность. Карточка из одних
   * обязательных полей — не поломка, и разделов под пустые поля на ней
   * быть не должно: прочерки стоят в личном кабинете, где их видит
   * владелец, а не посетитель.
   */
  it('не рисует разделы под незаполненные поля', async () => {
    server.use(
      ...publicTeacherHandlers([
        makeTeacher({
          id: 1,
          degree: null,
          rank: null,
          email: null,
          phoneNumber: null,
          messenger: null,
          experience: null,
          professionalExperience: null,
          education: null,
          qualification: null,
          bio: null,
          subjects: [],
          examScheduleGraduation: null,
          examScheduleNonGraduation: null,
        }),
      ]),
    );

    renderCard(1);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Петров Пётр Петрович',
    );
    // Должность осталась одна — без степени и звания и без лишней запятой.
    expect(screen.getByText('доцент кафедры')).toBeInTheDocument();

    for (const section of [
      'Стаж работы',
      'Образование',
      'Повышение квалификации',
      'О преподавателе',
      'Читаемые дисциплины',
      'Расписание экзаменов',
    ]) {
      expect(screen.queryByText(section)).not.toBeInTheDocument();
    }
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('на несуществующей карточке объясняет и ведёт к списку', async () => {
    renderCard(9000);

    expect(await screen.findByText('Преподаватель не найден')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К списку преподавателей' })).toHaveAttribute(
      'href',
      '/about/employee/teachers',
    );
  });

  /**
   * Битый `id` в запрос не уходит вовсе: на «abc» бэкенд ответил бы `400`,
   * и человек увидел бы «ошибка сервера» вместо «нет такой страницы».
   * Что запроса не было, проверяет сам стенд — незамоканный запрос при
   * `onUnhandledRequest: 'error'` уронил бы тест.
   */
  it('на нечисловой адрес не ходит на сервер, а показывает «не найден»', async () => {
    renderCard('abc');

    expect(await screen.findByText('Преподаватель не найден')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка карточки преподавателя')).not.toBeInTheDocument();
  });

  it('без сети объясняет, что связи нет', async () => {
    onlineManager.setOnline(false);

    renderCard(1);

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('на 500 показывает сбой, а «Повторить» загружает карточку', async () => {
    server.use(
      http.get(TEACHER_URL, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/public/teachers/1',
        }),
      ),
    );

    renderCard(1);

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('Не удалось загрузить карточку преподавателя'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Абрамов Никита Сергеевич')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
