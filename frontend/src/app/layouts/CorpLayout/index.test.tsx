import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { clearSession } from '@shared/api';
import { makeProfile } from '@shared/api/mocks';
import { CALENDAR_ROUTE, PERSONAL_ROUTE } from '@shared/config/routes';
import type { Profile } from '@shared/types';
import { renderWithProviders } from '@/test/render';
import { signInAs } from '@/test/session';

import CorpLayout from './index';

function renderCorp(profile: Profile) {
  return renderWithProviders(
    <Routes>
      <Route path="/corp" element={<CorpLayout />}>
        <Route path={PERSONAL_ROUTE} element={<p>Профиль</p>} />
      </Route>
    </Routes>,
    { route: PERSONAL_ROUTE, queryClient: signInAs(profile) },
  );
}

afterEach(() => {
  clearSession();
});

describe('CorpLayout', () => {
  it('преподавателю — вкладки кабинета и календаря', () => {
    renderCorp(makeProfile({ teacher: true }));

    const nav = screen.getByRole('navigation', { name: 'Разделы личного кабинета' });

    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Календарь событий' })).toHaveAttribute(
      'href',
      CALENDAR_ROUTE,
    );
    expect(screen.getByRole('link', { name: 'Личный кабинет' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('админу — тоже: календарь открыт суперпользователю', () => {
    renderCorp(makeProfile({ superuser: true }));

    expect(screen.getByRole('link', { name: 'Календарь событий' })).toBeInTheDocument();
  });

  /**
   * Модератору и обычной учётке календарь закрыт, а меню из одного пункта,
   * ведущего на текущую страницу, ничего не даёт — строки нет вовсе.
   */
  it('модератору и обычной учётке вкладок нет, страница на месте', () => {
    renderCorp(makeProfile({ moderator: true }));

    expect(screen.getByText('Профиль')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Разделы личного кабинета' })).toBeNull();
  });
});
