import { onlineManager } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import { makeTeacher, problemResponse, teacherHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { clearSession, setAccessToken } from '@shared/api';
import type { Profile } from '@shared/types';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import PersonalPage from './index';

const TEACHERS_ME = '*/api/teachers/me';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 1,
    username: 'petrov',
    firstName: 'Пётр',
    lastName: 'Петров',
    email: 'petrov@stankin.ru',
    avatar: null,
    avatarUrl: null,
    teacher: true,
    moderator: false,
    superuser: false,
    ...overrides,
  };
}

/**
 * Личный кабинет вошедшего преподавателя.
 *
 * Профиль кладётся в кэш **до** рендера, а не приезжает запросом: страница
 * без профиля не рисует ничего, и состояние оборванной сети иначе не
 * проверить — запрос профиля встал бы на ту же паузу. Это не обход, а тот
 * самый случай из жизни: профиль лежит в кэше пять минут, а карточка ППС
 * запрашивается заново.
 */
function renderPersonalPage(profile: Profile = makeProfile()) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(authKeys.profile, profile);

  setAccessToken('test-access-token');

  return renderWithProviders(<PersonalPage />, { route: '/corp/personal', queryClient });
}

afterEach(() => {
  clearSession();
  // Сеть возвращается всем: `onlineManager` — глобальный синглтон Query,
  // и оставленный офлайн поставил бы на паузу запросы соседнего теста.
  onlineManager.setOnline(true);
});

describe('PersonalPage, секция карточки ППС', () => {
  it('показывает карточку преподавателя', async () => {
    server.use(...teacherHandlers(makeTeacher({ position: 'доцент кафедры' })));

    renderPersonalPage();

    expect(await screen.findByText('Информация о преподавателе')).toBeInTheDocument();
    expect(screen.getByText('доцент кафедры')).toBeInTheDocument();
  });

  /**
   * D-F11. Пауза — не ошибка: `error` при ней `null`, а `isLoading` уже
   * снят. Пока секция считала обрыв по `error.status === 0`, не выставлялось
   * ни одно состояние, `card` оставался `null`, и секция возвращала `null`
   * целиком — заголовка над ней нет, поэтому преподаватель без сети видел
   * личный кабинет вообще без своей карточки и без объяснения.
   */
  it('без сети объясняет обрыв связи, а не исчезает', async () => {
    onlineManager.setOnline(false);

    renderPersonalPage();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  /**
   * `404` — не сбой, а состояние: роль есть, карточку модератор не привязал.
   * Красной плашки здесь быть не должно, делать преподавателю нечего.
   */
  it('на 404 говорит, что карточка не привязана', async () => {
    server.use(...teacherHandlers(null));

    renderPersonalPage();

    expect(await screen.findByText('Карточка преподавателя не привязана')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом', async () => {
    server.use(
      http.get(TEACHERS_ME, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/teachers/me',
        }),
      ),
    );

    renderPersonalPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось загрузить карточку преподавателя');
    expect(alert).toHaveTextContent('Ошибка на сервере, попробуйте позже.');
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();
  });

  /**
   * Оборванная сеть при живом браузере (`status === 0`) — это сбой с текстом,
   * а не пауза. Ветки разные намеренно, и подписи у них тоже разные.
   */
  it('на обрыв запроса показывает сбой, а не «нет связи»', async () => {
    server.use(http.get(TEACHERS_ME, () => HttpResponse.error()));

    renderPersonalPage();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Не удалось связаться с сервером. Проверьте соединение.');
    expect(screen.queryByText('Нет связи с сервером')).not.toBeInTheDocument();
  });

  /** Не преподаватель — секции нет вовсе, и запроса тоже. */
  it('обычному пользователю секцию не показывает', async () => {
    let asked = false;
    server.use(
      http.get(TEACHERS_ME, () => {
        asked = true;
        return HttpResponse.json(makeTeacher());
      }),
    );

    renderPersonalPage(makeProfile({ teacher: false }));

    expect(await screen.findByText('Личный кабинет')).toBeInTheDocument();
    expect(screen.queryByText('Информация о преподавателе')).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });
});
