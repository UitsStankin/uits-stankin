import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import { clearSession, setAccessToken } from '@shared/api';
import {
  makeProfile,
  postgraduateHandlers,
  profileHandlers,
  subjectHandlers,
  teacherHandlers,
} from '@shared/api/mocks';
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
  server.use(
    ...profileHandlers(profile),
    ...subjectHandlers(),
    ...postgraduateHandlers(),
    ...teacherHandlers(),
  );

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
  /**
   * Заглушек в меню не осталось: с F-47 сделан последний раздел блока 4.
   * Проверка стояла здесь на ненаписанном разделе и уехала вместе с ним;
   * сама заглушка проверяется своим тестом (`PlannedSectionPage`).
   * Взамен — что раздел аспирантуры и его форма разложены роутером.
   */
  it('открывает раздел аспирантуры и форму записи её адресом', async () => {
    renderAt('/admin/postgraduates');

    expect(await screen.findByRole('heading', { name: 'Аспирантура' })).toBeInTheDocument();
    expect(screen.queryByText('Раздел ещё не сделан')).not.toBeInTheDocument();
  });

  it('открывает форму новой записи аспирантуры', async () => {
    renderAt('/admin/postgraduates/new');

    expect(
      await screen.findByRole('heading', { name: 'Новая запись аспирантуры' }),
    ).toBeInTheDocument();
  });

  it('у несуществующего раздела говорит, что раздела нет', async () => {
    renderAt('/admin/nope');

    // До этой проверки такой адрес ловил корневой '*' и отвечал
    // «Страница ещё не перенесена» — то есть обещал раздел, которого
    // не существует вовсе.
    expect(await screen.findByText('Такого раздела нет')).toBeInTheDocument();
    expect(screen.queryByText('Страница ещё не перенесена')).not.toBeInTheDocument();
  });

  /**
   * Форма раздела сайта — плоская запись рядом с разделами, как форма
   * карточки ППС. Проверяется на настоящем дереве: разделы раскладываются
   * из `ADMIN_SECTIONS` общим правилом, и забытая рядом запись осталась бы
   * незамеченной тестами самой страницы — они рисуют её напрямую.
   */
  it('открывает форму раздела сайта её адресом внутри админки', async () => {
    renderAt('/admin/pages/contacts');

    expect(await screen.findByRole('heading', { name: 'Правка раздела' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Подпись раздела' })).toHaveValue('Контакты');
  });

  it('снаружи админки заглушка переноса остаётся прежней', async () => {
    // Публичных страниц старого портала перенесено меньше половины,
    // и там этот текст честен. Проверка сторожит границу: правка адресов
    // админки не должна была его тронуть.
    renderAt('/about/nope');

    expect(await screen.findByText('Страница ещё не перенесена')).toBeInTheDocument();
  });
});
