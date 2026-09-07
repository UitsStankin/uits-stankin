import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import { clearSession, setAccessToken } from '@shared/api';
import { makeProfile, profileHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import type { AdminAccess, Profile } from '@shared/types';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import RoleRoute from './RoleRoute';

/**
 * Роут по ролям.
 *
 * Профиль кладётся в кэш до рендера — по той же причине, что в тестах
 * личного кабинета: страница за защитой без профиля не рисует ничего,
 * а `useAuth` всё равно уходит за ним фоном, поэтому хендлер отдаёт
 * тот же самый профиль.
 *
 * Рендерится **внутри `Routes`**, а не голым элементом: не вошедшего
 * защита уводит на форму входа, и без второго роута уходить было бы
 * некуда — компонент остался бы смонтированным на новом адресе
 * и запускал бы переход снова и снова, до зависшего теста. Заодно
 * видно, что гость доехал именно до логина, а не просто не увидел
 * содержимое.
 */
function renderGuarded(profile: Profile | null, access: AdminAccess = 'moderator') {
  const queryClient = createTestQueryClient();

  if (profile) {
    queryClient.setQueryData(authKeys.profile, profile);
    setAccessToken('test-access-token');
    server.use(...profileHandlers(profile));
  }

  return renderWithProviders(
    <Routes>
      <Route
        path="/admin"
        element={
          <RoleRoute access={access}>
            <p>Содержимое админки</p>
          </RoleRoute>
        }
      />
      <Route path="/auth/login" element={<p>Форма входа</p>} />
    </Routes>,
    { route: '/admin', queryClient },
  );
}

afterEach(() => {
  clearSession();
});

describe('RoleRoute', () => {
  it('пускает модератора в раздел контента', async () => {
    renderGuarded(makeProfile({ moderator: true }));

    expect(await screen.findByText('Содержимое админки')).toBeInTheDocument();
  });

  it('пускает админа туда же, куда модератора', async () => {
    renderGuarded(makeProfile({ superuser: true }));

    expect(await screen.findByText('Содержимое админки')).toBeInTheDocument();
  });

  it('пускает админа в раздел учётных записей', async () => {
    renderGuarded(makeProfile({ superuser: true }), 'admin');

    expect(await screen.findByText('Содержимое админки')).toBeInTheDocument();
  });

  /**
   * Первое настоящее различие ролей на фронте: учётными записями
   * распоряжается только админ, модератор получил бы `403` от бэкенда
   * (docs/API.md, «Роли»). Экран обязан сказать это до запроса.
   */
  it('не пускает модератора в раздел учётных записей', async () => {
    renderGuarded(makeProfile({ moderator: true }), 'admin');

    expect(await screen.findByText('Недостаточно прав')).toBeInTheDocument();
    expect(
      screen.getByText('Этот раздел доступен только администратору портала.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Содержимое админки')).not.toBeInTheDocument();
  });

  /**
   * Вошедшему, но не тому: экран отказа, а не форма входа. Уводить его
   * на логин значило бы предложить войти тем же аккаунтом ещё раз.
   */
  it('показывает преподавателю отказ, а не форму входа', async () => {
    renderGuarded(makeProfile({ teacher: true }));

    expect(await screen.findByText('Недостаточно прав')).toBeInTheDocument();
    expect(screen.queryByText('Содержимое админки')).not.toBeInTheDocument();
  });

  /** Гостю — на форму входа: ему как раз есть что там сделать. */
  it('уводит не вошедшего на форму входа', async () => {
    renderGuarded(null);

    expect(await screen.findByText('Форма входа')).toBeInTheDocument();
    expect(screen.queryByText('Содержимое админки')).not.toBeInTheDocument();
    expect(screen.queryByText('Недостаточно прав')).not.toBeInTheDocument();
  });
});
