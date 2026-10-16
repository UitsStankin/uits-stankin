import { onlineManager } from '@tanstack/react-query';
import { Route, Routes } from 'react-router';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { achievementHandlers, makeAchievement, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import AchievementDetailPage from './index';

/**
 * Рендер через роут, а не голым компонентом: `id` страница берёт из адреса
 * через `useParams`, а он пуст, пока запись не сопоставлена с шаблоном пути.
 */
function renderDetail(id: number | string) {
  return renderWithProviders(
    <Routes>
      <Route path="/scientific-activities/achievements/:id" element={<AchievementDetailPage />} />
    </Routes>,
    { route: `/scientific-activities/achievements/${String(id)}` },
  );
}

afterEach(() => {
  onlineManager.setOnline(true);
});

describe('AchievementDetailPage', () => {
  /**
   * Достижение целиком по прямой ссылке. Вторая запись фикстуры привязана
   * к первой карточке ППС — на ней видно ссылку на преподавателя.
   */
  it('показывает достижение целиком', async () => {
    renderDetail(2);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Достижение 2' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Краткое описание достижения 2.')).toBeInTheDocument();

    // Rich-text доехал разметкой, а не текстом с тегами.
    expect(
      screen.getByText('Награда присуждена за работы в области автоматизации.'),
    ).toBeInTheDocument();

    // Имя преподавателя — ссылка на его карточку: здесь, в отличие
    // от карточки в списке, растянутой ссылки нет и она никому не мешает.
    expect(screen.getByRole('link', { name: 'Абрамов Никита Сергеевич' })).toHaveAttribute(
      'href',
      '/about/employee/teachers/1',
    );

    expect(screen.getByRole('link', { name: 'Ко всем достижениям' })).toHaveAttribute(
      'href',
      '/scientific-activities/achievements',
    );
  });

  /**
   * Обложка у достижения обязательна по контракту — в отличие от новости
   * и объявления, где её может не быть. Описания у неё нет вовсе: такого
   * поля нет ни в контракте, ни в старой модели, поэтому `alt` пустой,
   * и картинка декоративна.
   */
  it('рисует обложку декоративной картинкой', async () => {
    const { container } = renderDetail(2);

    await screen.findByRole('heading', { level: 1, name: 'Достижение 2' });

    const cover = container.querySelector('article img');
    expect(cover).toHaveAttribute('src', '/media/achievements/2026/08/b41e.jpg');
    expect(cover).toHaveAttribute('alt', '');
  });

  /**
   * Кафедральное достижение — единственный случай, когда у записи чего-то
   * нет. Пустой подписи на месте преподавателя быть не должно.
   */
  it('у кафедрального достижения не рисует подпись преподавателя', async () => {
    server.use(
      ...achievementHandlers([
        makeAchievement({ id: 5, title: 'Грант кафедре', teacherId: null, teacherName: null }),
      ]),
    );

    renderDetail(5);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Грант кафедре' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Преподаватель:')).not.toBeInTheDocument();
  });

  it('на несуществующем достижении зовёт к разделу', async () => {
    renderDetail(9000);

    expect(await screen.findByText('Достижение не найдено')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К достижениям кафедры' })).toHaveAttribute(
      'href',
      '/scientific-activities/achievements',
    );
  });

  /**
   * Нечисловой `id` в адресе — та же несуществующая страница для посетителя;
   * в запрос он уходить не должен вовсе: `@PathVariable Long` ответил бы
   * на него `400`, то есть «ошибкой сервера» вместо опечатки в ссылке.
   */
  it('на мусор вместо id не ходит на сервер и показывает «не найдено»', async () => {
    let requested = false;
    server.use(
      http.get('*/api/public/achievements/:id', () => {
        requested = true;
        return problemResponse(400, {
          title: 'Bad Request',
          detail: 'Неверный идентификатор',
          instance: '/api/public/achievements/abc',
        });
      }),
    );

    renderDetail('abc');

    expect(await screen.findByText('Достижение не найдено')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  it('на 500 показывает сбой и повторяет запрос по кнопке', async () => {
    server.use(
      http.get('*/api/public/achievements/:id', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/public/achievements/2',
        }),
      ),
    );

    renderDetail(2);

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить достижение')).toBeInTheDocument();

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Достижение 2' }),
    ).toBeInTheDocument();
  });

  /**
   * Без сети запрос не падает, а встаёт на паузу: ни `isLoading`,
   * ни `isError` при этом не выставлены, и без своей ветки страница
   * осталась бы пустой.
   */
  it('без сети объясняет, что связи нет', async () => {
    onlineManager.setOnline(false);

    renderDetail(2);

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});
