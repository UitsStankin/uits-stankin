import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { authKeys } from '@features/auth/api/profileQuery';
import {
  fileHandlers,
  makeProfile,
  makeTeacher,
  problemResponse,
  profileHandlers,
  teacherHandlers,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { clearSession, setAccessToken } from '@shared/api';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import type { Profile } from '@shared/types';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import PersonalPage from './index';

const TEACHERS_ME = '*/api/teachers/me';
const PROFILE = '*/api/users/profile';

/** Учётка преподавателя: по умолчанию на странице обе карточки. */
function makeTeacherProfile(overrides: Partial<Profile> = {}): Profile {
  return makeProfile({ teacher: true, ...overrides });
}

/**
 * Личный кабинет вошедшего пользователя.
 *
 * Профиль кладётся в кэш **до** рендера, а не приезжает запросом: страница
 * без профиля не рисует ничего, и состояние оборванной сети иначе не
 * проверить — запрос профиля встал бы на ту же паузу. Это не обход, а тот
 * самый случай из жизни: профиль лежит в кэше пять минут, а карточка ППС
 * запрашивается заново.
 *
 * Ручки профиля при этом всё равно подставляются: `useAuth` считает
 * положенные данные устаревшими и уходит за ними фоном. Пока хендлера
 * не было, этот запрос молча улетал в «необработанный» — тесты зеленели,
 * но одна из проверок в них была случайной. Мок отдаёт **тот же** профиль,
 * что лежит в кэше: иначе фоновый ответ перетирал бы подставленный,
 * и, например, секция ППС исчезала бы посреди теста.
 */
function renderPersonalPage(profile: Profile = makeTeacherProfile()) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(authKeys.profile, profile);

  setAccessToken('test-access-token');
  server.use(...profileHandlers(profile), ...fileHandlers());

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

    renderPersonalPage(makeProfile());

    expect(await screen.findByText('Личный кабинет')).toBeInTheDocument();
    expect(screen.queryByText('Информация о преподавателе')).not.toBeInTheDocument();
    expect(asked).toBe(false);
  });
});

/**
 * Правка профиля (F-27). Все проверки — через наблюдаемое поведение,
 * а не через подсматривание тела запроса: мок `PUT` применяет тело
 * по правилам контракта, поэтому «карточка после сохранения» отвечает
 * и на вопрос «что ушло на сервер». Поле, которое форма забыла прислать,
 * контракт очищает, — и это видно на карточке.
 *
 * Учётка здесь без роли преподавателя: на странице тогда одна карточка,
 * один аватар и одна пара полей «Фамилия»/«Имя», и запросы в проверки
 * не подмешивается вторая секция.
 */
describe('PersonalPage, правка профиля', () => {
  const WITH_AVATAR = {
    avatar: 'avatars/2026/08/a3f9.jpg',
    avatarUrl: '/media/avatars/2026/08/a3f9.jpg',
  };

  /** Перейти к правке. Возвращает поля, которые нужны почти каждому тесту. */
  async function openEditor() {
    fireEvent.click(await screen.findByRole('button', { name: 'Редактировать' }));

    return {
      lastName: screen.getByLabelText('Фамилия'),
      firstName: screen.getByLabelText('Имя'),
      save: screen.getByRole('button', { name: 'Сохранить' }),
    };
  }

  /** Единственный аватар на странице — в карточке или в форме. */
  function avatarSrc(container: HTMLElement) {
    return container.querySelector('img')?.getAttribute('src');
  }

  it('открывает форму с текущими именем и фамилией', async () => {
    renderPersonalPage(makeProfile());

    const form = await openEditor();

    expect(form.lastName).toHaveValue('Петров');
    expect(form.firstName).toHaveValue('Пётр');
  });

  it('«Отмена» возвращает карточку и забывает правки', async () => {
    renderPersonalPage(makeProfile());

    const first = await openEditor();
    fireEvent.change(first.lastName, { target: { value: 'Сидоров' } });
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(await screen.findByText('Петров Пётр')).toBeInTheDocument();

    // Форма смонтирована заново — значит, и начальные значения тоже.
    const second = await openEditor();
    expect(second.lastName).toHaveValue('Петров');
  });

  /**
   * `PUT` — полная замена: форма обязана слать все три поля, включая
   * нетронутые. Проверяется по результату — правится одна фамилия,
   * а имя и аватар обязаны уцелеть: не пришли бы они в теле, контракт
   * очистил бы и то и другое.
   */
  it('сохраняет и присылает нетронутые поля тоже', async () => {
    const { container } = renderPersonalPage(makeProfile(WITH_AVATAR));

    const form = await openEditor();
    fireEvent.change(form.lastName, { target: { value: 'Сидоров' } });
    fireEvent.click(form.save);

    expect(await screen.findByText('Профиль сохранён.')).toBeInTheDocument();
    expect(screen.getByText('Сидоров Пётр')).toBeInTheDocument();
    expect(avatarSrc(container)).toBe(WITH_AVATAR.avatarUrl);
  });

  /** Очистка имени — разрешённая контрактом операция, а не пустая форма. */
  it('позволяет очистить имя', async () => {
    renderPersonalPage(makeProfile());

    const form = await openEditor();
    fireEvent.change(form.firstName, { target: { value: '' } });
    fireEvent.click(form.save);

    expect(await screen.findByText('Профиль сохранён.')).toBeInTheDocument();
    expect(screen.getByText('Петров')).toBeInTheDocument();
  });

  /**
   * Почта и логин показаны, но не полями ввода: сервер их в теле молча
   * игнорирует, и поле, которое можно заполнить впустую, обмануло бы.
   */
  it('почту и логин показывает, но не полем ввода', async () => {
    renderPersonalPage(makeProfile());

    await openEditor();

    expect(screen.getByText('petrov@stankin.ru')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('petrov@stankin.ru')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('petrov')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Логин и почту в личном кабинете изменить нельзя/),
    ).toBeInTheDocument();
  });

  /**
   * Аватар уходит в раздел `avatars` и возвращается ключом, который форма
   * обязана отправить как есть. Мок кладёт раздел в ключ и меняет ключ
   * на каждую загрузку: попади файл в чужой раздел или отправь форма
   * что-то своё вместо ответа — адрес на карточке был бы другим.
   */
  it('сохраняет загруженный аватар ключом из ответа загрузки', async () => {
    const { container } = renderPersonalPage(makeProfile());

    const form = await openEditor();
    fireEvent.change(screen.getByLabelText('Выбрать фото'), {
      target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] },
    });

    expect(await screen.findByRole('button', { name: 'Удалить фото' })).toBeInTheDocument();
    fireEvent.click(form.save);

    expect(await screen.findByText('Профиль сохранён.')).toBeInTheDocument();
    expect(avatarSrc(container)).toBe('/media/avatars/uploaded-1.jpg');
  });

  it('«Удалить фото» стирает аватар', async () => {
    const { container } = renderPersonalPage(makeProfile(WITH_AVATAR));

    const form = await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить фото' }));
    fireEvent.click(form.save);

    expect(await screen.findByText('Профиль сохранён.')).toBeInTheDocument();
    expect(avatarSrc(container)).toBe(DEFAULT_AVATAR_URL);
  });

  /** Нечего убирать — нет и кнопки: «Удалить фото» под заглушкой пусто. */
  it('без аватара не предлагает его удалить', async () => {
    renderPersonalPage(makeProfile());

    await openEditor();

    expect(screen.queryByRole('button', { name: 'Удалить фото' })).not.toBeInTheDocument();
  });

  /** Формат проверяется до отправки: пятнадцать мегабайт впустую не летят. */
  it('файл не того формата на сервер не отправляет', async () => {
    let uploads = 0;
    renderPersonalPage(makeProfile());
    server.use(
      http.post('*/api/files', () => {
        uploads += 1;
        return HttpResponse.json({ key: 'avatars/x.gif', url: '/media/avatars/x.gif' });
      }),
    );

    await openEditor();
    fireEvent.change(screen.getByLabelText('Выбрать фото'), {
      target: { files: [new File(['x'], 'photo.gif', { type: 'image/gif' })] },
    });

    expect(await screen.findByText('Фото — только JPEG или PNG.')).toBeInTheDocument();
    expect(uploads).toBe(0);
  });

  /** Длину проверяет и zod, и сервер. Своя проверка бережёт запрос. */
  it('слишком длинную фамилию на сервер не отправляет', async () => {
    let puts = 0;
    renderPersonalPage(makeProfile());
    server.use(
      http.put(PROFILE, () => {
        puts += 1;
        return HttpResponse.json(makeProfile());
      }),
    );

    const form = await openEditor();
    fireEvent.change(form.lastName, { target: { value: 'я'.repeat(151) } });
    fireEvent.click(form.save);

    expect(await screen.findByText('Не длиннее 150 символов')).toBeInTheDocument();
    expect(puts).toBe(0);
  });

  /** Словарь `@Valid` раскладывается по полям формы, а не в баннер. */
  it('ошибку валидации показывает у поля', async () => {
    renderPersonalPage(makeProfile());
    server.use(
      http.put(PROFILE, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Проверьте правильность заполнения формы.',
          instance: '/api/users/profile',
          errors: { lastName: ['Фамилия слишком длинная'] },
        }),
      ),
    );

    const form = await openEditor();
    fireEvent.click(form.save);

    expect(await screen.findByText('Фамилия слишком длинная')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * `400` без словаря — негодный ключ аватара: например, файл вычистила
   * уборка сирот, пока форма была открыта. Поля здесь ни при чём,
   * и причина идёт баннером, как её прислал сервер.
   */
  it('отказ без словаря показывает баннером', async () => {
    renderPersonalPage(makeProfile());
    server.use(
      http.put(PROFILE, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Файл аватара не найден в разделе avatars',
          instance: '/api/users/profile',
        }),
      ),
    );

    const form = await openEditor();
    fireEvent.click(form.save);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Файл аватара не найден в разделе avatars');
    // Форма осталась открытой: правки не потеряны, «Сохранить» на месте.
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
  });

  /** 5xx не показывает внутреннюю диагностику — только человеческий текст. */
  it('на 500 показывает человеческий текст, а не диагностику', async () => {
    renderPersonalPage(makeProfile());
    server.use(
      http.put(PROFILE, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'NullPointerException в UserService',
          instance: '/api/users/profile',
        }),
      ),
    );

    const form = await openEditor();
    fireEvent.click(form.save);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ошибка на сервере, попробуйте позже.');
    expect(screen.queryByText('NullPointerException в UserService')).not.toBeInTheDocument();
  });
});
