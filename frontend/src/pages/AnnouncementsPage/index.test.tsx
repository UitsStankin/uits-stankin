import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { makeNews, newsHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import AnnouncementsPage from './index';

/**
 * Объявления кафедры.
 *
 * Шесть состояний ленты уже проверены на новостях (`pages/NewsPage`) — виджет
 * у них один и тот же. Здесь проверяется только то, чем раздел от новостей
 * отличается: какой `postType` уходит в запрос, куда ведут ссылки пагинатора
 * и какими словами подписана пустота.
 */
describe('AnnouncementsPage', () => {
  it('показывает объявления и не показывает новости', async () => {
    renderWithProviders(<AnnouncementsPage />, { route: '/about/announcements' });

    expect(await screen.findByText('Объявление 1')).toBeInTheDocument();
    expect(screen.getByText('Объявление 5')).toBeInTheDocument();

    // Главная проверка тикета: отбор делает бэкенд по `?postType=`. Новости
    // в фикстуре идут вперемешку с объявлениями и на первой же странице
    // были бы видны, уйди запрос без параметра.
    expect(screen.queryByText('Новость 1')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Объявления кафедры');
  });

  /**
   * Пагинатор собирает адреса от своего раздела, а не от `/about/news`:
   * иначе вторая страница объявлений уводила бы в новости.
   */
  it('листает внутри своего раздела', async () => {
    server.use(
      ...newsHandlers(
        Array.from({ length: 21 }, (_, index) =>
          makeNews({
            id: index + 1,
            title: `Объявление ${index + 1}`,
            postType: 'announcements',
          }),
        ),
      ),
    );

    renderWithProviders(<AnnouncementsPage />, { route: '/about/announcements' });

    expect(await screen.findByText('Объявление 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Страница 2' })).toHaveAttribute(
      'href',
      '/about/announcements?page=2',
    );
  });

  it('на пустом разделе говорит про объявления, а не про новости', async () => {
    server.use(...newsHandlers([]));

    renderWithProviders(<AnnouncementsPage />, { route: '/about/announcements' });

    expect(await screen.findByText('Объявлений пока нет')).toBeInTheDocument();
    expect(screen.queryByText('Новостей пока нет')).not.toBeInTheDocument();
  });
});
