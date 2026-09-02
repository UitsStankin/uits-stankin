import { Route, Routes } from 'react-router';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { conferenceHandlers, makeConference } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import ConferenceDetailPage from './index';

/**
 * Рендер через роут, а не голым компонентом: `id` страница берёт из адреса
 * через `useParams`, а он пуст, пока запись не сопоставлена с шаблоном пути.
 */
function renderDetail(id: number | string) {
  return renderWithProviders(
    <Routes>
      <Route path="/scientific-activities/conferences/:id" element={<ConferenceDetailPage />} />
    </Routes>,
    { route: `/scientific-activities/conferences/${id}` },
  );
}

describe('ConferenceDetailPage', () => {
  /**
   * Объявление целиком по прямой ссылке: шапка, блок фактов с датами
   * и контактами, rich-text. Вторая запись фикстуры — двухдневная,
   * на ней виден диапазон дат.
   */
  it('показывает объявление целиком', async () => {
    renderDetail(2);

    expect(await screen.findByRole('heading', { level: 1, name: 'Конференция 2' }))
      .toBeInTheDocument();
    expect(
      screen.getByText('Ежегодная научно-практическая конференция кафедры.'),
    ).toBeInTheDocument();

    // Диапазон схлопнут форматтером — не «2 октября … — 4 октября …».
    expect(screen.getByText('2–4 октября 2026 г.')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('кафедра УИТС, МГТУ «СТАНКИН»')).toBeInTheDocument();

    // Почта и телефон — ссылки: на телефоне это один тап до письма и звонка.
    expect(screen.getByRole('link', { name: 'conf@stankin.ru' })).toHaveAttribute(
      'href',
      'mailto:conf@stankin.ru',
    );
    expect(screen.getByRole('link', { name: '+7 (499) 972-95-84' })).toHaveAttribute(
      'href',
      'tel:+7 (499) 972-95-84',
    );

    // Rich-text доехал разметкой, а не текстом с тегами.
    expect(screen.getByText('Приглашаем к участию.')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Ко всем конференциям' })).toHaveAttribute(
      'href',
      '/scientific-activities/conferences',
    );
  });

  /**
   * `endDate: null` — единственное представление однодневной конференции
   * по контракту: равенство дат нормализует бэкенд, фронту сравнивать нечего.
   */
  it('у однодневной конференции показывает одну дату, а не диапазон', async () => {
    renderDetail(1);

    expect(await screen.findByText('1 октября 2026 г.')).toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });

  /**
   * Обязателен у объявления только `title`. Каждый блок рисуется, лишь когда
   * ему есть что показать: объявление из одного заголовка — это заголовок,
   * а не лесенка пустых подписей.
   */
  it('объявление из одного заголовка не рисует пустых подписей', async () => {
    server.use(
      ...conferenceHandlers([
        makeConference({
          id: 9,
          title: 'Только заголовок',
          description: null,
          startDate: null,
          endDate: null,
          time: null,
          organizer: null,
          contactEmail: null,
          contactPhone: null,
          content: null,
        }),
      ]),
    );

    renderDetail(9);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Только заголовок' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Даты проведения')).not.toBeInTheDocument();
    expect(screen.queryByText('Время начала')).not.toBeInTheDocument();
    expect(screen.queryByText('Организатор')).not.toBeInTheDocument();
    expect(screen.queryByText('Электронная почта')).not.toBeInTheDocument();
    expect(screen.queryByText('Телефон')).not.toBeInTheDocument();
  });

  it('на несуществующем объявлении зовёт к списку', async () => {
    renderDetail(9000);

    expect(await screen.findByText('Объявление не найдено')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К списку конференций' })).toHaveAttribute(
      'href',
      '/scientific-activities/conferences',
    );
  });

  /**
   * Нечисловой `id` в адресе — та же несуществующая страница для посетителя;
   * в запрос он не уходит вовсе (`model/useConferenceItem.ts`).
   */
  it('на нечисловом id показывает «не найдено», а не ошибку сервера', async () => {
    renderDetail('abc');

    expect(await screen.findByText('Объявление не найдено')).toBeInTheDocument();
  });
});
