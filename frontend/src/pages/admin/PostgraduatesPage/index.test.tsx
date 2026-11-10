import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makePostgraduate, postgraduateHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import AdminPostgraduatesPage from './index';

const PUBLIC_POSTGRADUATES = '*/api/public/postgraduates';
const POSTGRADUATES = '*/api/postgraduates';

/**
 * Раздел аспирантуры админки: список, поиск, удаление. Форма — своей
 * страницей и своим тестом (`PostgraduateFormPage`). Прав здесь
 * не проверяют: за них отвечает `RoleRoute`.
 */
function renderPage(route = '/admin/postgraduates') {
  return renderWithProviders(
    <>
      <AdminPostgraduatesPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/** Свой список на каждый тест: мок помнит, что в нём удалили. */
beforeEach(() => {
  server.use(...postgraduateHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

function rowOf(studentName: string) {
  const row = screen.getByRole('cell', { name: studentName }).closest('tr');

  if (!row) throw new Error(`строки «${studentName}» нет в разметке`);

  return within(row);
}

describe('AdminPostgraduatesPage, список', () => {
  it('показывает записи первой страницы по алфавиту фамилий', async () => {
    renderPage();

    expect(await screen.findByRole('cell', { name: 'Абдулов Тимур Русланович' })).toBeInTheDocument();
    expect(rowOf('Абдулов Тимур Русланович').getByRole('cell', { name: 'Баранов Илья Матвеевич' })).toBeInTheDocument();

    // Двадцать первая запись — уже на второй странице.
    expect(screen.queryByRole('cell', { name: 'Хайруллин Ильдар Маратович' })).not.toBeInTheDocument();
  });

  it('подписывает запись без руководителя и без специальности', async () => {
    renderPage();

    // Третья запись фикстуры — без руководителя, пятая — без специальности.
    await screen.findByRole('cell', { name: 'Верещагина Софья Андреевна' });

    expect(rowOf('Верещагина Софья Андреевна').getByText('не назначен')).toBeInTheDocument();
    expect(rowOf('Дорохова Алиса Игоревна').getByRole('cell', { name: '—' })).toBeInTheDocument();
  });

  it('ведёт на форму правки ссылкой из строки', async () => {
    renderPage();

    await screen.findByRole('cell', { name: 'Абдулов Тимур Русланович' });

    expect(
      screen.getByRole('link', { name: 'Править запись «Абдулов Тимур Русланович»' }),
    ).toHaveAttribute('href', '/admin/postgraduates/1');
    expect(screen.getByRole('link', { name: 'Добавить' })).toHaveAttribute(
      'href',
      '/admin/postgraduates/new',
    );
  });

  /** Почему сортировки нет — разбор в `usePostgraduatesAdmin`. */
  it('не предлагает сортировку и не отправляет её', async () => {
    let requested: string | null = null;
    server.use(
      http.get(PUBLIC_POSTGRADUATES, ({ request }) => {
        requested = request.url;
      }),
    );

    renderPage();
    await screen.findByRole('cell', { name: 'Абдулов Тимур Русланович' });

    expect(requested).not.toContain('sort=');
    expect(screen.queryByRole('button', { name: /Аспирант/ })).not.toBeInTheDocument();
  });

  it('ищет на сервере и считает найденное', async () => {
    renderPage();
    await screen.findByRole('cell', { name: 'Абдулов Тимур Русланович' });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск записей аспирантуры' }), {
      target: { value: 'жданова' },
    });

    expect(await screen.findByText('Найдено записей: 1')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Жданова Милана' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Абдулов Тимур Русланович' })).not.toBeInTheDocument();
  });

  it('открывает поиск из адреса и сохраняет его при листании', async () => {
    renderPage('/admin/postgraduates?q=2.3.1');

    expect(await screen.findByRole('searchbox')).toHaveValue('2.3.1');
    expect(await screen.findByText(/Найдено записей:/)).toBeInTheDocument();
  });

  it('говорит, что под поиск ничего не попало, и ведёт ко всему списку', async () => {
    renderPage('/admin/postgraduates?q=никого-нет');

    expect(await screen.findByText('Ничего не нашлось')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Показать все' })).toHaveAttribute(
      'href',
      '/admin/postgraduates',
    );
  });

  it('говорит, что записей нет вовсе', async () => {
    server.use(...postgraduateHandlers([]));

    renderPage();

    expect(await screen.findByText('Записей пока нет')).toBeInTheDocument();
  });

  it('объясняет страницу за пределами данных', async () => {
    renderPage('/admin/postgraduates?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(PUBLIC_POSTGRADUATES, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/public/postgraduates',
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText('Не удалось загрузить записи аспирантуры')).toBeInTheDocument();

    server.use(...postgraduateHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Абдулов Тимур Русланович' })).toBeInTheDocument();
  });

  it('без сети говорит об этом, а не крутит скелет', async () => {
    onlineManager.setOnline(false);

    renderPage();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

describe('AdminPostgraduatesPage, удаление', () => {
  it('удаляет запись после подтверждения', async () => {
    server.use(...postgraduateHandlers([makePostgraduate({ id: 7, studentName: 'Абрамов Пётр Сергеевич' })]));

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Удалить запись «Абрамов Пётр Сергеевич»' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Удалить запись аспирантуры?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Запись «Абрамов Пётр Сергеевич» удалена')).toBeInTheDocument();
    expect(await screen.findByText('Записей пока нет')).toBeInTheDocument();
  });

  it('не удаляет по «Отмене»', async () => {
    let deleted = false;
    server.use(
      http.delete(`${POSTGRADUATES}/:id`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Удалить запись «Абдулов Тимур Русланович»' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Удалить запись аспирантуры?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Отмена' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleted).toBe(false);
  });

  it('показывает отказ тостом и оставляет запись', async () => {
    server.use(
      http.delete(`${POSTGRADUATES}/:id`, () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Запись аспирантуры id=1 не найдена',
          instance: '/api/postgraduates/1',
        }),
      ),
    );

    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Удалить запись «Абдулов Тимур Русланович»' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Удалить запись аспирантуры?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Запись аспирантуры id=1 не найдена')).toBeInTheDocument();
    expect(screen.queryByText(/удалена/)).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Абдулов Тимур Русланович' })).toBeInTheDocument();
  });
});
