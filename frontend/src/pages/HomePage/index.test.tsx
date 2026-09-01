import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { editablePageHandlers, newsHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import HomePage from './index';

/** Секция по её заголовку: на главной их две, и они почти одинаковые. */
function section(title: string) {
  return screen.getByRole('heading', { level: 2, name: title }).closest('section')!;
}

/**
 * Главная: два редактируемых блока и две секции записей.
 *
 * Проверяется страница целиком, а не хук: витрина отличается от ленты
 * не полями модели, а тем, что на ней две почти одинаковые секции,
 * и перепутать их местами, размерами или ссылками — ровно то, что здесь
 * может сломаться.
 */
describe('HomePage', () => {
  it('показывает новости и объявления двумя секциями', async () => {
    renderWithProviders(<HomePage />);

    const news = section('Последние новости');
    expect(await within(news).findByText('Новость 1')).toBeInTheDocument();

    const announcements = section('Последние объявления');
    expect(within(announcements).getByText('Объявление 1')).toBeInTheDocument();

    // Секции не перепутаны: каждая показывает только свой тип. Записи
    // в фикстуре идут вперемешку, и общий запрос без `postType` привёл бы
    // объявления в новостную секцию.
    expect(within(news).queryByText('Объявление 1')).not.toBeInTheDocument();
    expect(within(announcements).queryByText('Новость 1')).not.toBeInTheDocument();
  });

  /**
   * Пять и четыре — числа из оригинала. Проверяются по границе: шестая
   * новость и пятое объявление на главную не попадают.
   */
  it('берёт пять новостей и четыре объявления', async () => {
    renderWithProviders(<HomePage />);

    const news = section('Последние новости');
    expect(await within(news).findByText('Новость 5')).toBeInTheDocument();
    expect(within(news).queryByText('Новость 6')).not.toBeInTheDocument();

    const announcements = section('Последние объявления');
    expect(within(announcements).getByText('Объявление 4')).toBeInTheDocument();
    expect(within(announcements).queryByText('Объявление 5')).not.toBeInTheDocument();
  });

  /**
   * Ссылка «Все объявления» ведёт в свой раздел, а не в новости, — ради
   * этого F-28 и делался после F-20: до него вести было некуда.
   */
  it('уводит из каждой секции в её раздел', async () => {
    renderWithProviders(<HomePage />);

    const news = section('Последние новости');
    expect(await within(news).findByRole('link', { name: 'Все новости' })).toHaveAttribute(
      'href',
      '/about/news',
    );

    const announcements = section('Последние объявления');
    expect(within(announcements).getByRole('link', { name: 'Все объявления' })).toHaveAttribute(
      'href',
      '/about/announcements',
    );
  });

  /**
   * На чистой базе оба блока пусты — и тогда их не должно быть вовсе,
   * ни карточки, ни отступа: пустой белый прямоугольник на главной сообщал бы
   * посетителю о внутренней кухне портала то, что ему знать незачем.
   */
  it('пустые редактируемые блоки не рисует вовсе', async () => {
    const { container } = renderWithProviders(<HomePage />);

    await screen.findByText('Новость 1');

    // Секции — тоже `<section>`, поэтому считаются только те, что не они.
    expect(container.querySelectorAll('section')).toHaveLength(2);
  });

  it('заполненные блоки показывает над секциями и под ними', async () => {
    server.use(
      ...editablePageHandlers({
        'home-before': '# Кафедра ИТ-6',
        'home-after': 'Текст под лентой',
      }),
    );

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Кафедра ИТ-6');
    expect(screen.getByText('Текст под лентой')).toBeInTheDocument();
  });

  /**
   * Сбой показан в каждой секции своими словами и со своей кнопкой.
   * Ветка отдельная от такой же у ленты: разметку главная не заимствует —
   * у секции нет пагинации, зато есть ссылка «ко всем», и состояния сбоя
   * у неё свои.
   */
  it('на 500 показывает сбой в обеих секциях и чинится «Повторить»', async () => {
    server.use(
      http.get('*/api/public/news', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Что-то пошло не так на сервере',
          instance: '/api/public/news',
        }),
      ),
    );

    renderWithProviders(<HomePage />);

    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(within(alerts[0]).getByText('Не удалось загрузить новости')).toBeInTheDocument();
    expect(within(alerts[1]).getByText('Не удалось загрузить объявления')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();

    // Бэкенд «починился»: следующий запрос уходит уже в исходные хендлеры.
    server.resetHandlers();
    fireEvent.click(within(alerts[0]).getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Новость 1')).toBeInTheDocument();

    // Вторая секция чинится своей кнопкой: «Повторить» перезапрашивает
    // свою ленту, а не обе разом.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  /**
   * Пустой раздел подписан своими словами. Проверка не косметическая:
   * на чистой базе это единственное, что на главной вообще будет видно.
   */
  it('на пустой базе объясняет пустоту в каждой секции своими словами', async () => {
    server.use(...newsHandlers([]));

    renderWithProviders(<HomePage />);

    expect(await screen.findByText('Новостей пока нет')).toBeInTheDocument();
    expect(screen.getByText('Объявлений пока нет')).toBeInTheDocument();
  });
});
