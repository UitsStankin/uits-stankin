import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { conferenceHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import ConferencesPage from './index';

const CONFERENCES_URL = '*/api/public/conferences';

/** Ответ `500` вместо списка — то, что на живом бэкенде не воспроизвести. */
function respondWithServerError() {
  server.use(
    http.get(CONFERENCES_URL, () =>
      problemResponse(500, {
        title: 'Internal Server Error',
        detail: 'Что-то пошло не так на сервере',
        instance: '/api/public/conferences',
      }),
    ),
  );
}

/**
 * Список конференций целиком: адрес → запрос → разметка.
 *
 * Проверяется страница, а не хук, по правилу тестов ленты новостей:
 * состояний шесть, различаются они тем, что видит человек, и половина —
 * ветки, до которых на живом бэкенде не добраться.
 */
describe('ConferencesPage', () => {
  it('показывает скелет, потом первую страницу списка', async () => {
    renderWithProviders(<ConferencesPage />, { route: '/scientific-activities/conferences' });

    expect(screen.getByText('Загрузка объявлений о конференциях')).toBeInTheDocument();

    expect(await screen.findByText('Конференция 1')).toBeInTheDocument();
    expect(screen.getByText('Конференция 20')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка объявлений о конференциях')).not.toBeInTheDocument();

    // Двадцать первая — уже на второй странице: размер страницы держит
    // контракт, а не фронт.
    expect(screen.queryByText('Конференция 21')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Объявления о конференциях',
    );
  });

  it('карточка ведёт на детальную страницу объявления', async () => {
    renderWithProviders(<ConferencesPage />, { route: '/scientific-activities/conferences' });

    expect(await screen.findByRole('link', { name: 'Конференция 1' })).toHaveAttribute(
      'href',
      '/scientific-activities/conferences/1',
    );
  });

  it('открывает страницу из адреса и отмечает её в пагинаторе', async () => {
    renderWithProviders(<ConferencesPage />, {
      route: '/scientific-activities/conferences?page=2',
    });

    expect(await screen.findByText('Конференция 21')).toBeInTheDocument();
    expect(screen.getByText('Конференция 23')).toBeInTheDocument();
    expect(screen.queryByText('Конференция 1')).not.toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * `?page=abc` приезжает от людей, правящих адрес руками, и из обрезанных
   * ссылок. Ожидание — первая страница, а не ошибка и не пустой экран.
   */
  it('на мусор в номере страницы показывает первую', async () => {
    renderWithProviders(<ConferencesPage />, {
      route: '/scientific-activities/conferences?page=abc',
    });

    expect(await screen.findByText('Конференция 1')).toBeInTheDocument();
  });

  it('на пустом списке объясняет, что объявлений нет', async () => {
    server.use(...conferenceHandlers([]));

    renderWithProviders(<ConferencesPage />, { route: '/scientific-activities/conferences' });

    expect(await screen.findByText('Объявлений о конференциях пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * Страница за пределами данных — не ошибка: контракт отвечает на неё `200`
   * с пустым `content`, и отличить её от пустого раздела можно только
   * по `totalPages`.
   */
  it('за пределами данных зовёт на первую страницу, а не показывает пустоту', async () => {
    renderWithProviders(<ConferencesPage />, {
      route: '/scientific-activities/conferences?page=3',
    });

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К первой странице' })).toBeInTheDocument();
    expect(screen.queryByText('Объявлений о конференциях пока нет')).not.toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом, а не диагностикой сервера', async () => {
    respondWithServerError();

    renderWithProviders(<ConferencesPage />, { route: '/scientific-activities/conferences' });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('Не удалось загрузить объявления о конференциях'),
    ).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();
  });

  it('«Повторить» после сбоя загружает список', async () => {
    respondWithServerError();

    renderWithProviders(<ConferencesPage />, { route: '/scientific-activities/conferences' });

    const retry = await screen.findByRole('button', { name: 'Повторить' });

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(retry);

    expect(await screen.findByText('Конференция 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
