import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import { clearSession, hasSession, setAccessToken } from '@shared/api';
import {
  makeProfile,
  postgraduateHandlers,
  profileHandlers,
  problemResponse,
  subjectHandlers,
  teacherHandlers,
} from '@shared/api/mocks';
import { makePublication, publicationHandlers } from '@shared/api/mocks/publications';
import { authHandlers } from '@shared/api/mocks/auth';
import { ADMIN_GRADESHEETS_ROUTE, adminGradesheetRoute, publicationRoute, PUBLICATION_NEW_ROUTE, PUBLICATION_SCHOLAR_ROUTE } from '@shared/config/routes';
import { server } from '@shared/api/mocks/server';
import type { Profile } from '@shared/types';
import { createTestQueryClient } from '@/test/render';

import '@pages/admin/GradesheetsPage';
import '@pages/PublicationsPage/Management';
import './AdminScreens';

import { routes } from './index';

/**
 * Раскладка адресов админки на настоящем дереве роутов, а не на его копии
 * из теста: разъезжаются они именно тогда, когда проверяют копию.
 *
 * Профиль кладётся в кэш до рендера — как в тестах личного кабинета
 * и `RoleRoute`: за защитой без профиля не рисуется ничего.
 */
function renderAt(path: string, profile: Profile | null = makeProfile({ moderator: true })) {
  const queryClient = createTestQueryClient();

  if (profile) {
    queryClient.setQueryData(authKeys.profile, profile);
    setAccessToken('test-access-token');
    server.use(...profileHandlers(profile));
  }
  server.use(
    ...subjectHandlers(),
    ...postgraduateHandlers(),
    ...teacherHandlers(),
  );

  const router = createMemoryRouter(routes, { initialEntries: [path] });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  clearSession();
});

describe('вход в портал', () => {
  async function submitLogin() {
    fireEvent.change(await screen.findByLabelText('Логин'), { target: { value: 'test-user' } });
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));
  }

  it('возвращает к защищённой странице с её параметрами и якорем', async () => {
    server.use(...authHandlers(), ...profileHandlers(makeProfile({ moderator: true })));
    const router = renderAt('/admin/gradesheets?group=ИДБ-25-11#results', null);
    await submitLogin();

    await waitFor(() => expect(router.state.location).toMatchObject({
      pathname: '/admin/gradesheets',
      search: '?group=ИДБ-25-11',
      hash: '#results',
    }));
    expect(await screen.findByRole('link', { name: 'Базы данных · ИДБ-25-11' })).toBeInTheDocument();
  });

  it('показывает отказ по паре логин и пароль', async () => {
    server.use(http.post('*/api/users/auth/login', () => problemResponse(401, {
      title: 'Unauthorized',
      detail: 'Ошибка проверки',
      instance: '/api/users/auth/login',
    })));
    renderAt('/auth/login', null);
    await submitLogin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный логин или пароль.');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled();
  });

  it('блокирует повторный вход на время из Retry-After', async () => {
    server.use(http.post('*/api/users/auth/login', () => HttpResponse.json(
      { title: 'Too Many Requests', status: 429 },
      { status: 429, headers: { 'Retry-After': '30' } },
    )));
    renderAt('/auth/login', null);
    await submitLogin();

    expect(await screen.findByRole('alert')).toHaveTextContent('Повторите через 30 секунд.');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled();
  });
});

describe('адреса админки', () => {
  it('открывает раздел аспирантуры и форму записи её адресом', async () => {
    renderAt('/admin/postgraduates');

    expect(await screen.findByRole('heading', { name: 'Аспирантура' })).toBeInTheDocument();
  });

  it('открывает форму новой записи аспирантуры', async () => {
    renderAt('/admin/postgraduates/new');

    expect(
      await screen.findByRole('heading', { name: 'Новая запись аспирантуры' }),
    ).toBeInTheDocument();
  });

  it('открывает ведомости в админке модератора', async () => {
    renderAt(ADMIN_GRADESHEETS_ROUTE);
    expect(await screen.findByRole('link', { name: 'Базы данных · ИДБ-25-11' }))
      .toHaveAttribute('href', adminGradesheetRoute(1));
  });

  it('открывает карточку ведомости по прямой ссылке администратора', async () => {
    renderAt(adminGradesheetRoute(1), makeProfile({ superuser: true }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });

  it('закрывает ведомость по прямой ссылке от преподавателя', async () => {
    renderAt(adminGradesheetRoute(1), makeProfile({ teacher: true }));
    expect(await screen.findByText('Недостаточно прав')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('открывает управление публикациями из админки', async () => {
    renderAt('/admin/publications');
    expect(await screen.findByRole('heading', { name: 'Управление публикациями' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Поиск в Google Scholar' })).toHaveAttribute('href', PUBLICATION_SCHOLAR_ROUTE);
  });

  it('закрывает Google Scholar от преподавателя', async () => {
    renderAt(PUBLICATION_SCHOLAR_ROUTE, makeProfile({ teacher: true }));
    expect(await screen.findByText('Недостаточно прав')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Найти' })).not.toBeInTheDocument();
  });

  it('сохраняет адрес прежней вкладки публикаций преподавателя', async () => {
    const article = makePublication({ authors: ['Абрамов Никита Сергеевич'] });
    server.use(...publicationHandlers([article]));
    renderAt('/about/employee/teachers/1/publications');

    expect(await screen.findByRole('heading', { name: 'Публикации преподавателя' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: article.name })).toHaveAttribute('href', publicationRoute(1));
  });

  it('у несуществующего раздела говорит, что раздела нет', async () => {
    renderAt('/admin/nope');

    expect(await screen.findByText('Такого раздела нет')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ко всем разделам' })).toHaveAttribute('href', '/admin');
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

  it('показывает 404 внутри портала, сохраняя навигацию', async () => {
    renderAt('/about/nope');

    expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'На главную' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('открывает партнёров по старой ссылке с главной', async () => {
    const router = renderAt('/partners');
    expect(await screen.findByRole('heading', { name: 'Наши партнёры' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/about/partners');
    const logos = within(screen.getByRole('main')).getAllByRole('img');
    expect(logos).toHaveLength(24);
    expect(logos.every((logo) => logo.getAttribute('src'))).toBe(true);
  });

  it.each([
    ['/home?from=old', '/', '?from=old', ''],
    ['/about/announcements/1#main', '/about/news/1', '', '#main'],
    ['/about/employee/teachers/1/schedule', '/about/employee/teachers/1', '', ''],
  ])('перенаправляет старый адрес %s', async (legacy, pathname, search, hash) => {
    const router = renderAt(legacy);
    await waitFor(() => expect(router.state.location).toMatchObject({ pathname, search, hash }));
    expect(router.state.historyAction).toBe('REPLACE');
  });

  it('сохраняет черновик публикации при отмене перехода и при отмене выхода', async () => {
    const profile = makeProfile({ moderator: true });
    let logoutCalls = 0;
    server.use(http.post('*/api/users/auth/logout', () => {
      logoutCalls += 1;
      return new HttpResponse(null, { status: 204 });
    }));
    const router = renderAt(PUBLICATION_NEW_ROUTE, profile);
    const title = await screen.findByLabelText('Название');
    fireEvent.change(title, { target: { value: 'Черновик публикации' } });

    fireEvent.click(screen.getByRole('link', { name: 'К каталогу публикаций' }));
    const leave = await screen.findByRole('dialog', { name: 'Уйти без сохранения?' });
    fireEvent.click(within(leave).getByRole('button', { name: 'Отмена' }));
    expect(title).toHaveValue('Черновик публикации');

    function requestLogout() {
      const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.username;
      fireEvent.click(screen.getByRole('button', { name }));
      fireEvent.click(screen.getByRole('button', { name: 'Выход' }));
    }
    requestLogout();
    const logout = await screen.findByRole('dialog', { name: 'Выйти без сохранения?' });
    fireEvent.click(within(logout).getByRole('button', { name: 'Отмена' }));
    expect(title).toHaveValue('Черновик публикации');
    expect(hasSession()).toBe(true);
    expect(logoutCalls).toBe(0);

    requestLogout();
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Выйти без сохранения?' }))
      .getByRole('button', { name: 'Выйти' }));
    await waitFor(() => expect(logoutCalls).toBe(1));
    expect(router.state.location.pathname).toBe('/');
    expect(hasSession()).toBe(false);
  });

  it('спрашивает перед заменой черновика другой заготовкой Scholar', async () => {
    const router = renderAt(`${PUBLICATION_NEW_ROUTE}?title=Первая`);
    const title = await screen.findByLabelText('Название');
    expect(title).toHaveValue('Первая');
    fireEvent.change(title, { target: { value: 'Мой черновик' } });

    await act(() => router.navigate(`${PUBLICATION_NEW_ROUTE}?title=Вторая`));
    const leave = await screen.findByRole('dialog', { name: 'Уйти без сохранения?' });
    expect(title).toHaveValue('Мой черновик');
    fireEvent.click(within(leave).getByRole('button', { name: 'Уйти' }));
    await waitFor(() => expect(screen.getByLabelText('Название')).toHaveValue('Вторая'));
  });
});
