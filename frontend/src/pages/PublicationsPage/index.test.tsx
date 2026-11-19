import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';
import { fileHandlers } from '@shared/api/mocks/files';
import { problemResponse } from '@shared/api/mocks/problemResponse';
import { makePublication, publicationHandlers } from '@shared/api/mocks/publications';
import { server } from '@shared/api/mocks/server';
import { PUBLICATIONS_ROUTE, PUBLICATION_MANAGE_ROUTE, PUBLICATION_NEW_ROUTE, publicationEditRoute, publicationRoute } from '@shared/config/routes';

import PublicationsPage, { PublicationDetailPage, PublicationEditorPage, PublicationScholarPage, PublicationTagsPage } from './index';

const catalog = '*/api/public/publications';

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('Научные публикации', () => {
  it('применяет три фильтра вместе и сбрасывает номер страницы', async () => {
    const matching = makePublication();
    server.use(...publicationHandlers([
      matching,
      makePublication({ id: 2, name: 'Другая тема', tags: [] }),
      makePublication({ id: 3, name: 'Другой год', year: 2023 }),
      makePublication({ id: 4, name: 'Другой автор', authors: ['Иванов Иван'] }),
    ]));
    renderWithProviders(<PublicationsPage />, { route: `${PUBLICATIONS_ROUTE}?page=3` });

    expect(await screen.findByText('На этой странице нет публикаций.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На первую страницу' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Управление публикациями' })).not.toBeInTheDocument();

    await screen.findByRole('option', { name: 'Оптимизация' });
    change('Автор', 'чеканин');
    change('Год', '2024');
    change('Тег', '1');
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    expect(await screen.findByRole('link', { name: matching.name })).toHaveAttribute('href', publicationRoute(1));
    expect(screen.queryByText('Другая тема')).not.toBeInTheDocument();
    expect(screen.queryByText('Другой год')).not.toBeInTheDocument();
    expect(screen.queryByText('Другой автор')).not.toBeInTheDocument();
  });

  it('даёт повторить запрос после 500 и показывает пустой каталог', async () => {
    server.use(
      http.get(catalog, () => problemResponse(500, {
        title: 'Internal Server Error', detail: 'Диагностика', instance: '/api/public/publications',
      }), { once: true }),
      ...publicationHandlers([]),
    );
    renderWithProviders(<PublicationsPage />, { route: PUBLICATIONS_ROUTE });

    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(await screen.findByText('Публикации не найдены.')).toBeInTheDocument();
  });

  it('сохраняет PDF из ответа загрузчика и открывает созданную карточку', async () => {
    server.use(...publicationHandlers(), ...fileHandlers());
    renderWithProviders(
      <Routes>
        <Route path={PUBLICATION_NEW_ROUTE} element={<PublicationEditorPage />} />
        <Route path={publicationRoute(':id')} element={<PublicationDetailPage />} />
      </Routes>,
      { route: PUBLICATION_NEW_ROUTE },
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Оптимизация' }));
    change('Название', 'Моделирование раскроя');
    change('Авторы (по одному на строку)', 'Иванов И. И.\nПетров П. П.');
    change('Описание', 'Описание работы');
    change('Источник', 'Вестник');
    change('Год', '2024');
    const pdf = new File(['%PDF-'], 'article.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('PDF (до 15 МБ)'), { target: { files: [pdf] } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByRole('heading', { name: 'Моделирование раскроя' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Скачать PDF' })).toHaveAttribute('href', '/media/publications/uploaded-1.pdf');
    expect(screen.getByText('Иванов И. И., Петров П. П.')).toBeInTheDocument();
  });

  it('заменяет теги и сохраняет прежний PDF при правке', async () => {
    const file = 'publications/2026/11/article.pdf';
    const item = makePublication({ file, fileUrl: `/media/${file}` });
    server.use(...publicationHandlers([item]));
    renderWithProviders(
      <Routes>
        <Route path={publicationEditRoute(':id')} element={<PublicationEditorPage />} />
        <Route path={publicationRoute(':id')} element={<PublicationDetailPage />} />
      </Routes>,
      { route: publicationEditRoute(item.id) },
    );

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Оптимизация' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(await screen.findByRole('link', { name: 'Скачать PDF' })).toHaveAttribute('href', item.fileUrl);
    expect(screen.queryByRole('link', { name: 'Оптимизация' })).not.toBeInTheDocument();
  });

  it('удаляет публикацию только после подтверждения', async () => {
    const item = makePublication();
    server.use(...publicationHandlers([item]));
    renderWithProviders(
      <Routes>
        <Route path={publicationEditRoute(':id')} element={<PublicationEditorPage />} />
        <Route path={PUBLICATION_MANAGE_ROUTE} element={<PublicationsPage manage />} />
      </Routes>,
      { route: publicationEditRoute(item.id) },
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить публикацию' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getByLabelText('Название')).toHaveValue(item.name);
    fireEvent.click(screen.getByRole('button', { name: 'Удалить публикацию' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByRole('heading', { name: 'Управление публикациями' })).toBeInTheDocument();
    expect(await screen.findByText('Публикации не найдены.')).toBeInTheDocument();
  });

  it('переименовывает привязанный тег и обновляет карточку публикации', async () => {
    server.use(...publicationHandlers());
    renderWithProviders(<><PublicationTagsPage /><Routes>
      <Route path={publicationRoute(':id')} element={<PublicationDetailPage />} />
    </Routes></>, { route: publicationRoute(1) });
    await screen.findByRole('link', { name: 'Оптимизация' });
    fireEvent.click(screen.getByRole('button', { name: 'Переименовать' }));
    change('Новое название тега', 'Раскрой');
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByRole('link', { name: 'Раскрой' })).toHaveAttribute('href', `${PUBLICATIONS_ROUTE}?tagId=1`);
    expect(screen.queryByRole('link', { name: 'Оптимизация' })).not.toBeInTheDocument();
  });

  it('открывает черновик из Scholar и ждёт явного сохранения', async () => {
    server.use(...publicationHandlers(), http.post('*/api/publications', () => {
      throw new Error('Поиск не должен сохранять публикацию');
    }));
    renderWithProviders(
      <Routes>
        <Route path="/" element={<PublicationScholarPage />} />
        <Route path={PUBLICATION_NEW_ROUTE} element={<PublicationEditorPage />} />
      </Routes>,
    );

    change('Имя автора', 'Чеканин');
    fireEvent.click(screen.getByRole('button', { name: 'Найти' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Использовать в новой публикации' }));

    expect(await screen.findByRole('heading', { name: 'Новая публикация' })).toBeInTheDocument();
    expect(screen.getByLabelText('Название')).toHaveValue('Оптимизация ортогональной упаковки');
    expect(screen.getByLabelText('Год')).toHaveValue(2022);
    expect(screen.getByLabelText('Авторы (по одному на строку)')).toHaveValue('');
  });

  it('показывает время ожидания после 429 без автоматического повтора', async () => {
    let calls = 0;
    server.use(http.get('*/api/publications/scholar', () => {
      calls += 1;
      return HttpResponse.json({ title: 'Too Many Requests', status: 429 }, {
        status: 429, headers: { 'Retry-After': '30' },
      });
    }));
    renderWithProviders(<PublicationScholarPage />);

    change('Имя автора', 'Чеканин');
    fireEvent.click(screen.getByRole('button', { name: 'Найти' }));
    expect(await screen.findByText('Повторите запрос через 30 с.')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Страницы Google Scholar' }))
      .getByRole('button', { name: 'Следующая' })).toBeDisabled();
    expect(calls).toBe(1);
  });
});
