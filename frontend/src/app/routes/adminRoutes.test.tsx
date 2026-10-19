import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import { clearSession, setAccessToken } from '@shared/api';
import { makeProfile, profileHandlers, subjectHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { createTestQueryClient } from '@/test/render';

import { routes } from './index';

/**
 * Раскладка адресов админки на настоящем дереве роутов, а не на его копии
 * из теста: разъезжаются они именно тогда, когда проверяют копию.
 *
 * Профиль кладётся в кэш до рендера — как в тестах личного кабинета
 * и `RoleRoute`: за защитой без профиля не рисуется ничего.
 */
function renderAt(path: string) {
  const profile = makeProfile({ moderator: true });
  const queryClient = createTestQueryClient();

  queryClient.setQueryData(authKeys.profile, profile);
  setAccessToken('test-access-token');
  server.use(...profileHandlers(profile), ...subjectHandlers());

  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  clearSession();
});

describe('каркас админки', () => {
  it('рисует рабочую полосу вместо публичных шапки и подвала', async () => {
    renderAt('/admin');

    expect(await screen.findByRole('link', { name: /На сайт/ })).toHaveAttribute('href', '/');
    expect(screen.getByText('Управление сайтом')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Открыть меню' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(await screen.findByRole('navigation', { name: 'Разделы админки' })).toBeInTheDocument();
  });

  it('на главной даёт готовые разделы со словами и одной строкой «Скоро» для остальных', async () => {
    renderAt('/admin');

    expect(await screen.findByRole('heading', { name: 'Управление сайтом' })).toBeInTheDocument();
    expect(screen.getByText(/Опубликовать новость или объявление/)).toBeInTheDocument();
    expect(screen.getByText(/^Скоро: конференции, достижения кафедры/)).toBeInTheDocument();
    expect(screen.queryByText(/F-\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/учётные записи\./)).not.toBeInTheDocument();
  });

  it('не предлагает в меню профиля админ-панель, пока человек в ней', async () => {
    renderAt('/admin');

    fireEvent.click(await screen.findByRole('button', { name: /Пётр Петров/ }));

    expect(screen.getByRole('link', { name: 'Личный кабинет' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Админ-панель' })).not.toBeInTheDocument();
  });
});

describe('адреса админки', () => {
  it('у ненаписанного раздела показывает его тикет, а не «страница не найдена»', async () => {
    // Конференции, а не новости: на новостях эта проверка стояла до F-43,
    // и раздел из-под неё уехал — его написали. Любой ненаписанный
    // раздел годится одинаково, важен сам факт заглушки с тикетом.
    renderAt('/admin/conferences');

    // Ссылка в меню живая с самого начала: набор разделов — это карта
    // работ блока 4, и видеть её целиком полезнее, чем меню, растущее
    // по одному пункту.
    expect(await screen.findByText('Раздел скоро появится')).toBeInTheDocument();
    expect(screen.queryByText(/F-\d+/)).not.toBeInTheDocument();
  });

  it('у несуществующего раздела говорит, что раздела нет', async () => {
    renderAt('/admin/nope');

    // До этой проверки такой адрес ловил корневой '*' и отвечал
    // «Страница ещё не перенесена» — то есть обещал раздел, которого
    // не существует вовсе.
    expect(await screen.findByText('Такого раздела нет')).toBeInTheDocument();
    expect(screen.queryByText('Страница ещё не перенесена')).not.toBeInTheDocument();
  });

  it('снаружи админки заглушка переноса остаётся прежней', async () => {
    // Публичных страниц старого портала перенесено меньше половины,
    // и там этот текст честен. Проверка сторожит границу: правка адресов
    // админки не должна была его тронуть.
    renderAt('/about/nope');

    expect(await screen.findByText('Страница ещё не перенесена')).toBeInTheDocument();
  });
});
