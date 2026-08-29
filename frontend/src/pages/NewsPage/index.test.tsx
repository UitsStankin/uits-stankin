import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { newsHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import NewsPage from './index';

const NEWS_URL = '*/api/public/news';

/** Ответ `500` вместо ленты — то, что на живом бэкенде не воспроизвести. */
function respondWithServerError() {
  server.use(
    http.get(NEWS_URL, () =>
      problemResponse(500, {
        title: 'Internal Server Error',
        detail: 'Что-то пошло не так на сервере',
        instance: '/api/public/news',
      }),
    ),
  );
}

/**
 * Лента новостей целиком: адрес → запрос → разметка.
 *
 * Проверяется страница, а не хук: состояний у неё шесть, различаются они
 * не полями модели, а тем, что видит человек, и половина из них —
 * это ветки, до которых на живом бэкенде не добраться.
 */
describe('NewsPage', () => {
  it('показывает скелет, потом первую страницу ленты', async () => {
    renderWithProviders(<NewsPage />, { route: '/about/news' });

    expect(screen.getByText('Загрузка новостей')).toBeInTheDocument();

    expect(await screen.findByText('Новость 1')).toBeInTheDocument();
    expect(screen.getByText('Новость 20')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка новостей')).not.toBeInTheDocument();

    // Двадцать первая — уже на второй странице: размер страницы держит
    // контракт, а не фронт.
    expect(screen.queryByText('Новость 21')).not.toBeInTheDocument();
  });

  it('открывает страницу из адреса и отмечает её в пагинаторе', async () => {
    renderWithProviders(<NewsPage />, { route: '/about/news?page=2' });

    expect(await screen.findByText('Новость 21')).toBeInTheDocument();
    expect(screen.getByText('Новость 23')).toBeInTheDocument();
    expect(screen.queryByText('Новость 1')).not.toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * `?page=abc` приезжает от людей, правящих адрес руками, и из обрезанных
   * ссылок. Ожидание — первая страница, а не ошибка и не пустой экран.
   */
  it('на мусор в номере страницы показывает первую', async () => {
    renderWithProviders(<NewsPage />, { route: '/about/news?page=abc' });

    expect(await screen.findByText('Новость 1')).toBeInTheDocument();
  });

  it('на пустой ленте объясняет, что новостей нет', async () => {
    server.use(...newsHandlers([]));

    renderWithProviders(<NewsPage />, { route: '/about/news' });

    expect(await screen.findByText('Новостей пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * Страница за пределами данных — не ошибка: контракт отвечает на неё `200`
   * с пустым `content`. Отличить её от пустой ленты можно только
   * по `totalPages`, и это ровно то место, где легко показать «новостей нет»
   * вместо «такой страницы нет».
   */
  it('за пределами данных зовёт на первую страницу, а не показывает пустоту', async () => {
    renderWithProviders(<NewsPage />, { route: '/about/news?page=3' });

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К первой странице' })).toBeInTheDocument();
    expect(screen.queryByText('Новостей пока нет')).not.toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом, а не диагностикой сервера', async () => {
    respondWithServerError();

    renderWithProviders(<NewsPage />, { route: '/about/news' });

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить новости')).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();
  });

  it('«Повторить» после сбоя загружает ленту', async () => {
    respondWithServerError();

    renderWithProviders(<NewsPage />, { route: '/about/news' });

    const retry = await screen.findByRole('button', { name: 'Повторить' });

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(retry);

    expect(await screen.findByText('Новость 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
