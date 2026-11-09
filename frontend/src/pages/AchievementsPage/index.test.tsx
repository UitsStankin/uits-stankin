import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { achievementHandlers, makeAchievement, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import AchievementsPage from './index';

const ACHIEVEMENTS_URL = '*/api/public/achievements';
const ROUTE = '/scientific-activities/achievements';

/** Ответ `500` вместо списка — то, что на живом бэкенде не воспроизвести. */
function respondWithServerError() {
  server.use(
    http.get(ACHIEVEMENTS_URL, () =>
      problemResponse(500, {
        title: 'Internal Server Error',
        detail: 'Что-то пошло не так на сервере',
        instance: '/api/public/achievements',
      }),
    ),
  );
}

/**
 * Раздел достижений целиком: адрес → запрос → разметка.
 *
 * Проверяется страница, а не хук, по правилу тестов ленты новостей:
 * состояний шесть, различаются они тем, что видит человек, и половина —
 * ветки, до которых на живом бэкенде не добраться.
 */
describe('AchievementsPage', () => {
  it('показывает скелет, потом первую страницу списка', async () => {
    renderWithProviders(<AchievementsPage />, { route: ROUTE });

    expect(screen.getByText('Загрузка достижений кафедры')).toBeInTheDocument();

    expect(await screen.findByText('Достижение 1')).toBeInTheDocument();
    expect(screen.getByText('Достижение 20')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка достижений кафедры')).not.toBeInTheDocument();

    // Двадцать первое — уже на второй странице: размер страницы держит
    // контракт, а не фронт.
    expect(screen.queryByText('Достижение 21')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Достижения кафедры');
  });

  it('карточка ведёт на детальную страницу достижения', async () => {
    renderWithProviders(<AchievementsPage />, { route: ROUTE });

    expect(await screen.findByRole('link', { name: 'Достижение 1' })).toHaveAttribute(
      'href',
      '/scientific-activities/achievements/1',
    );
  });

  /**
   * Привязка к преподавателю — единственное, что у достижения бывает
   * пустым. Имя показывается текстом, а не ссылкой: карточка кликается
   * целиком, и вторая ссылка внутри неё пробила бы в этой растяжке дыру.
   */
  it('показывает преподавателя у привязанного достижения и молчит у кафедрального', async () => {
    server.use(
      ...achievementHandlers([
        makeAchievement({ id: 1, title: 'Личное', teacherId: 4, teacherName: 'Белова Е. А.' }),
        makeAchievement({
          id: 2,
          title: 'Кафедральное',
          teacherId: null,
          teacherName: null,
        }),
      ]),
    );

    renderWithProviders(<AchievementsPage />, { route: ROUTE });

    expect(await screen.findByText('Белова Е. А.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Белова Е. А.' })).not.toBeInTheDocument();

    // У кафедрального в карточке нет ни имени, ни подписи для диктора.
    const departmental = screen.getByRole('link', { name: 'Кафедральное' }).closest('article');
    expect(within(departmental as HTMLElement).queryByText('Преподаватель:')).toBeNull();
  });

  it('открывает страницу из адреса и отмечает её в пагинаторе', async () => {
    renderWithProviders(<AchievementsPage />, { route: `${ROUTE}?page=2` });

    expect(await screen.findByText('Достижение 21')).toBeInTheDocument();
    expect(screen.getByText('Достижение 23')).toBeInTheDocument();
    expect(screen.queryByText('Достижение 1')).not.toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * `?page=abc` приезжает от людей, правящих адрес руками, и из обрезанных
   * ссылок. Ожидание — первая страница, а не ошибка и не пустой экран.
   */
  it('на мусор в номере страницы показывает первую', async () => {
    renderWithProviders(<AchievementsPage />, { route: `${ROUTE}?page=abc` });

    expect(await screen.findByText('Достижение 1')).toBeInTheDocument();
  });

  it('на пустом списке объясняет, что достижений нет', async () => {
    server.use(...achievementHandlers([]));

    renderWithProviders(<AchievementsPage />, { route: ROUTE });

    expect(await screen.findByText('Достижений пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  /**
   * Страница за пределами данных — не ошибка: контракт отвечает на неё `200`
   * с пустым `content`, и отличить её от пустого раздела можно только
   * по `totalPages`.
   */
  it('за пределами данных зовёт на первую страницу, а не показывает пустоту', async () => {
    renderWithProviders(<AchievementsPage />, { route: `${ROUTE}?page=3` });

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К первой странице' })).toBeInTheDocument();
    expect(screen.queryByText('Достижений пока нет')).not.toBeInTheDocument();
  });

  it('на 500 показывает сбой человеческим текстом, а не диагностикой сервера', async () => {
    respondWithServerError();

    renderWithProviders(<AchievementsPage />, { route: ROUTE });

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить достижения')).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();
  });

  it('«Повторить» после сбоя загружает список', async () => {
    respondWithServerError();

    renderWithProviders(<AchievementsPage />, { route: ROUTE });

    const retry = await screen.findByRole('button', { name: 'Повторить' });

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(retry);

    expect(await screen.findByText('Достижение 1')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
