import { Route, Routes } from 'react-router';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import NewsDetailPage from './index';

/**
 * Ссылка «ко всем» на детальной странице.
 *
 * Проверяется через роут, а не голым рендером: `id` страница берёт из адреса
 * через `useParams`, а он пуст, пока запись не сопоставлена с шаблоном пути.
 */
function renderDetail(id: number) {
  return renderWithProviders(
    <Routes>
      <Route path="/about/news/:id" element={<NewsDetailPage />} />
    </Routes>,
    { route: `/about/news/${id}` },
  );
}

/**
 * Адрес записи один на оба раздела, поэтому вернуться «ко всем» страница
 * может только по типу самой записи. До F-20 вопроса не было: лента
 * `/about/news` показывала и то, и другое.
 */
describe('NewsDetailPage', () => {
  it('от объявления ведёт в объявления', async () => {
    // Пятая запись фикстуры — «Объявление 1».
    renderDetail(5);

    const back = await screen.findByRole('link', { name: 'Ко всем объявлениям' });
    expect(back).toHaveAttribute('href', '/about/announcements');
  });

  it('от новости ведёт в новости', async () => {
    renderDetail(1);

    const back = await screen.findByRole('link', { name: 'Ко всем новостям' });
    expect(back).toHaveAttribute('href', '/about/news');
  });

  /**
   * Записи нет — типа тоже нет, и угадывать раздел не по чему: обе кнопки
   * ведут в новости. Проверяется заодно, что `404` не роняет страницу
   * попыткой прочитать тип у пустоты.
   */
  it('на несуществующей записи ведёт в новости', async () => {
    renderDetail(9000);

    expect(await screen.findByText('Новость не найдена')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ко всем новостям' })).toHaveAttribute(
      'href',
      '/about/news',
    );
  });
});
