import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  editablePageHandlers,
  makeNews,
  newsHandlers,
  pageResponse,
  problemResponse,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { newsItemRoute } from '@shared/config/routes';
import { renderWithProviders } from '@/test/render';

import HomePage from './index';

/** Раздел страницы по его заголовку: на главной их десяток, и ищутся они именем. */
function region(name: string | RegExp) {
  return screen.findByRole('region', { name });
}

/**
 * Главная: первый экран, «главное сейчас», цифры, расписание, уровни обучения,
 * мероприятия, лента новостей, преподаватели, контакты.
 *
 * Проверяется страница целиком, а не хук: ошибиться здесь можно в соединении
 * частей — запрос с первого экрана должен попасть в поле блока расписания,
 * а ссылки первого экрана — переключить вкладки ниже.
 */
describe('HomePage', () => {
  describe('лента новостей', () => {
    it('собирает новости и объявления в одну ленту, новые сверху', async () => {
      renderWithProviders(<HomePage />);

      const feed = await region('Новости');
      expect(await within(feed).findByText('Новость 1')).toBeInTheDocument();
      expect(within(feed).getByText('Объявление 1')).toBeInTheDocument();

      // Лента не длиннее шести записей: шестая новость в неё не попадает.
      expect(within(feed).queryByText('Новость 6')).not.toBeInTheDocument();
    });

    /**
     * Пять и четыре — числа из оригинала. Проверяются по границе фильтром:
     * шестая новость и пятое объявление на главную не приезжают вовсе.
     */
    it('фильтр оставляет один тип и берёт пять новостей и четыре объявления', async () => {
      renderWithProviders(<HomePage />);

      const feed = await region('Новости');
      await within(feed).findByText('Новость 1');

      fireEvent.click(within(feed).getByRole('button', { name: 'Объявления' }));
      expect(within(feed).getByText('Объявление 4')).toBeInTheDocument();
      expect(within(feed).queryByText('Объявление 5')).not.toBeInTheDocument();
      expect(within(feed).queryByText('Новость 1')).not.toBeInTheDocument();

      fireEvent.click(within(feed).getByRole('button', { name: 'Новости' }));
      expect(within(feed).getByText('Новость 5')).toBeInTheDocument();
      expect(within(feed).queryByText('Новость 6')).not.toBeInTheDocument();
      expect(within(feed).queryByText('Объявление 1')).not.toBeInTheDocument();
    });

    it('уводит из ленты в оба раздела', async () => {
      renderWithProviders(<HomePage />);

      const feed = await region('Новости');
      expect(await within(feed).findByRole('link', { name: 'Все новости' })).toHaveAttribute(
        'href',
        '/about/news',
      );
      expect(within(feed).getByRole('link', { name: 'Все объявления' })).toHaveAttribute(
        'href',
        '/about/announcements',
      );
    });

    /**
     * Сбой показан своими словами и со своей кнопкой для каждой из двух
     * выдач: «Повторить» перезапрашивает свою ленту, а не обе разом.
     */
    it('на 500 показывает сбой по каждой выдаче и чинится «Повторить»', async () => {
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

      const feed = await region('Новости');
      expect(await within(feed).findByText('Новость 1')).toBeInTheDocument();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
    });

    it('на пустой базе объясняет пустоту каждой выдачи своими словами', async () => {
      server.use(...newsHandlers([]));

      renderWithProviders(<HomePage />);

      expect(await screen.findByText('Новостей пока нет')).toBeInTheDocument();
      expect(screen.getByText('Объявлений пока нет')).toBeInTheDocument();
    });
  });

  describe('редактируемые блоки', () => {
    /**
     * На чистой базе оба блока пусты — и тогда их не должно быть вовсе,
     * ни карточки, ни отступа.
     */
    it('пустые блоки не рисует вовсе', async () => {
      const { container } = renderWithProviders(<HomePage />);

      await screen.findByText('Новость 1');

      expect(container.querySelector('.u-prose-block')).toBeNull();
    });

    it('заполненные блоки показывает над контактами', async () => {
      server.use(
        ...editablePageHandlers({
          'home-before': '# Кафедра ИТ-6',
          'home-after': 'Текст под лентой',
        }),
      );

      renderWithProviders(<HomePage />);

      // Разборщик Markdown грузится отдельным куском, и под нагрузкой полного
      // прогона секунды по умолчанию не хватает.
      expect(
        await screen.findByRole('heading', { name: 'Кафедра ИТ-6' }, { timeout: 5000 }),
      ).toBeInTheDocument();
      expect(await screen.findByText('Текст под лентой', {}, { timeout: 5000 })).toBeInTheDocument();
    });

    it('единственный h1 страницы — заголовок первого экрана', async () => {
      server.use(...editablePageHandlers({ 'home-before': 'Просто текст' }));

      renderWithProviders(<HomePage />);

      await screen.findByText('Просто текст', {}, { timeout: 5000 });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });
  });

  describe('расписание', () => {
    it('считает пары и преподавателей в цифрах', async () => {
      renderWithProviders(<HomePage />);

      const numbers = await region(/^Кафедра в\s+цифрах$/);
      expect(await within(numbers).findByText('пары в расписании')).toBeInTheDocument();
      expect(within(numbers).getByText('2 преподавателя с загруженным расписанием')).toBeInTheDocument();
    });

    it('ставит рядом с цифрами свежую новость с обложкой ссылкой на неё', async () => {
      server.use(
        http.get('*/api/public/news', () =>
          HttpResponse.json(
            pageResponse([
              makeNews({
                id: 77,
                title: 'Новость с фото',
                previewImageUrl: '/media/cover.jpg',
                previewImageDescription: 'Лаборатория',
              }),
            ]),
          ),
        ),
      );
      renderWithProviders(<HomePage />);

      const numbers = await region(/^Кафедра в\s+цифрах$/);
      const link = await within(numbers).findByRole('link', { name: /Новость с фото/ });
      expect(link).toHaveAttribute('href', newsItemRoute(77));
    });

    it('находит пары по фамилии преподавателя', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      const input = await within(band).findByLabelText('Преподаватель или группа');
      fireEvent.change(input, { target: { value: 'Чеканин' } });

      expect(await within(band).findByText(/всего найдено 2/)).toBeInTheDocument();
    });

    it('находит пары по группе и подписывает преподавателя', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      const input = await within(band).findByLabelText('Преподаватель или группа');
      fireEvent.change(input, { target: { value: 'ИДБ-23-12' } });

      const found = await within(band).findByRole('tabpanel');
      expect(within(found).getByText('Базы данных')).toBeInTheDocument();
      expect(within(found).getByText('Разумовский А. И.')).toBeInTheDocument();
      expect(within(found).getByText('подгруппа А')).toBeInTheDocument();
    });

    it('сообщает, когда ничего не нашлось', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      const input = await within(band).findByLabelText('Преподаватель или группа');
      fireEvent.change(input, { target: { value: 'несуществующая' } });

      expect(await within(band).findByText(/Ничего не нашлось/)).toBeInTheDocument();
    });

    it('переносит запрос с первого экрана в поле блока расписания', async () => {
      renderWithProviders(<HomePage />);

      const hero = screen.getByRole('search', { name: 'Расписание преподавателя или группы' });
      fireEvent.change(within(hero).getByRole('searchbox'), { target: { value: 'Чеканин' } });
      fireEvent.submit(hero);

      const band = await region('Расписание');
      expect(within(band).getByLabelText('Преподаватель или группа')).toHaveValue('Чеканин');
      expect(await within(band).findByText(/всего найдено 2/)).toBeInTheDocument();
    });

    it('подставляет фамилию из кнопки преподавателя', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      fireEvent.click(await within(band).findByRole('button', { name: 'Разумовский А. И.' }));

      expect(within(band).getByLabelText('Преподаватель или группа')).toHaveValue('Разумовский');
    });
  });

  describe('уровни обучения', () => {
    it('переключает вкладки и меняет шифр направления', async () => {
      renderWithProviders(<HomePage />);

      const panel = await screen.findByRole('tabpanel');
      expect(within(panel).getByText('09.03.03')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: 'Магистратура' }));
      expect(within(screen.getByRole('tabpanel')).getByText('09.04.01')).toBeInTheDocument();
    });

    it('открывает нужную вкладку по ссылке с первого экрана', async () => {
      renderWithProviders(<HomePage />);

      fireEvent.click(await screen.findByRole('link', { name: 'Аспирантура' }));

      expect(
        within(screen.getByRole('tabpanel')).getByRole('heading', { name: 'Аспирантура и наука' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Аспирантура' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  describe('преподаватели', () => {
    const TEACHER_HREF = /^\/about\/employee\/teachers\/\d+$/;

    async function teacherCards() {
      const people = await region('Преподаватели');
      await waitFor(() =>
        expect(
          within(people)
            .getAllByRole('link')
            .filter((link) => TEACHER_HREF.test(link.getAttribute('href') ?? '')),
        ).toHaveLength(8),
      );
      return people;
    }

    it('показывает карточки ссылками на страницы преподавателей', async () => {
      renderWithProviders(<HomePage />);

      await teacherCards();
    });

    it('без фото рисует инициалы вместо картинки', async () => {
      renderWithProviders(<HomePage />);

      const people = await teacherCards();

      // У первого в фикстуре фото есть, у остальных нет: картинка одна, инициалы у семи.
      expect(people.querySelectorAll('img.u-person-photo')).toHaveLength(1);
      expect(people.querySelectorAll('.u-person-initials')).toHaveLength(7);
    });

    it('при наведении не открывает плавающих окон', async () => {
      renderWithProviders(<HomePage />);

      const people = await teacherCards();
      fireEvent.pointerEnter(within(people).getAllByRole('link')[1]);

      expect(document.querySelector('.u-kinetic-card')).toBeNull();
    });
  });
});
