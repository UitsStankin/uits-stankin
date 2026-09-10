import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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

describe('адреса админки', () => {
  it('у ненаписанного раздела показывает его тикет, а не «страница не найдена»', async () => {
    renderAt('/admin/news');

    // Ссылка в меню живая с самого начала: набор разделов — это карта
    // работ блока 4, и видеть её целиком полезнее, чем меню, растущее
    // по одному пункту.
    expect(await screen.findByText('Раздел ещё не сделан')).toBeInTheDocument();
    expect(screen.getByText(/F-43/)).toBeInTheDocument();
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
