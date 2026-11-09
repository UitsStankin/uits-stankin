import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { editablePageHandlers, pageResponse, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import AdminEditablePagesPage from './index';

const PAGES = '*/api/pages';

function renderSections(route = '/admin/pages') {
  return renderWithProviders(<AdminEditablePagesPage />, { route });
}

beforeEach(() => {
  server.use(...editablePageHandlers());
});

afterEach(() => {
  onlineManager.setOnline(true);
});

/** Строка таблицы, в которой есть такой текст. */
function rowWith(text: string) {
  const row = screen.getByText(text).closest('tr');

  if (!row) throw new Error(`строки с «${text}» нет в разметке`);

  return within(row);
}

describe('AdminEditablePagesPage', () => {
  /**
   * Порядок — по `id`, то есть как в сиде: разделы там сгруппированы
   * по меню сайта. Сторож на порядке, а не только на составе: переставленные
   * по алфавиту, бакалавриат и магистратура разъехались бы по списку.
   */
  it('показывает все тринадцать разделов в порядке сида', async () => {
    renderSections();

    await screen.findByText('Направления подготовки');

    const rows = within(screen.getByRole('table')).getAllByRole('row');

    // Первая строка — заголовки колонок.
    expect(rows).toHaveLength(14);
    expect(rows[1]).toHaveTextContent('Направления подготовки');
    expect(rows[13]).toHaveTextContent('Главная: блок под новостями');
  });

  it('отличает заполненный раздел от пустого', async () => {
    server.use(...editablePageHandlers({ contacts: '## Как нас найти' }));

    renderSections();

    await screen.findByText('Контакты');

    expect(rowWith('Контакты').getByText('Заполнен')).toBeInTheDocument();
    expect(rowWith('Аспирантура').getByText('Пуст')).toBeInTheDocument();
  });

  /** Как на сайте: текст из одних пробелов показывается надписью «не заполнен». */
  it('считает пустым раздел из одних пробелов и переводов строки', async () => {
    server.use(...editablePageHandlers({ contacts: '  \n\n ' }));

    renderSections();

    await screen.findByText('Контакты');

    expect(rowWith('Контакты').getByText('Пуст')).toBeInTheDocument();
  });

  it('ведёт правку раздела на его адрес', async () => {
    renderSections();

    expect(await screen.findByRole('link', { name: 'Править раздел «Контакты»' })).toHaveAttribute(
      'href',
      '/admin/pages/contacts',
    );
  });

  /**
   * В перенесённых со старого портала строках подписи бывает нет. Раздел
   * при этом обязан различаться — слагом — и открываться.
   */
  it('подписывает раздел без подписи его слагом', async () => {
    server.use(
      http.get(PAGES, () =>
        HttpResponse.json(
          pageResponse([
            {
              slug: 'contacts',
              title: null,
              text: '',
              createdAt: '2026-08-01T10:15:30.123456+03:00',
              updatedAt: '2026-08-20T10:15:30.123456+03:00',
            },
          ]),
        ),
      ),
    );

    renderSections();

    expect(await screen.findByText('Без подписи')).toBeInTheDocument();
    expect(rowWith('Без подписи').getByText('contacts')).toBeInTheDocument();
    expect(rowWith('Без подписи').getByRole('link', { name: 'Править раздел «contacts»' })).toHaveAttribute(
      'href',
      '/admin/pages/contacts',
    );
  });

  /** Пустой список — не «модератор ничего не завёл»: разделы заводит миграция. */
  it('объясняет пустой список не прошедшей миграцией', async () => {
    server.use(http.get(PAGES, () => HttpResponse.json(pageResponse([]))));

    renderSections();

    expect(await screen.findByText('Разделов нет')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(PAGES, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/pages',
        }),
      ),
    );

    renderSections();

    expect(await screen.findByText('Не удалось загрузить разделы')).toBeInTheDocument();

    server.use(...editablePageHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Контакты')).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderSections();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});
