import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  editablePageHandlers,
  makeLesson,
  makeNews,
  newsHandlers,
  pageResponse,
  problemResponse,
  scheduleHandlers,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { newsItemRoute } from '@shared/config/routes';
import { renderWithProviders } from '@/test/render';

import HomePage from './index';

/** Раздел страницы по его заголовку: на главной их десяток, и ищутся они именем. */
function region(name: string | RegExp) {
  return screen.findByRole('region', { name });
}

/** Ввод в поле блока расписания и отправка формы: пары показываются только после неё. */
async function searchSchedule(band: HTMLElement, text: string) {
  const input = await within(band).findByLabelText('Преподаватель или группа');
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(input.closest('form') as HTMLFormElement);
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
    }, 15000);

    it('единственный h1 страницы — заголовок первого экрана', async () => {
      server.use(...editablePageHandlers({ 'home-before': 'Просто текст' }));

      renderWithProviders(<HomePage />);

      await screen.findByText('Просто текст', {}, { timeout: 5000 });
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });
  });

  describe('карусель «Главное сейчас»', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('идёт кольцом: настоящие карточки читаются, копии для петли скрыты', async () => {
      renderWithProviders(<HomePage />);

      const carousel = await region('Главное сейчас');
      expect(await within(carousel).findByRole('group', { name: '1 из 3' })).toBeInTheDocument();
      expect(within(carousel).getAllByRole('group')).toHaveLength(3);

      const copies = carousel.querySelectorAll('[data-slide]');
      expect(copies).toHaveLength(9);
      expect(carousel.querySelectorAll('[data-slide][inert]')).toHaveLength(6);
    });

    it('не показывает номер карточки', async () => {
      renderWithProviders(<HomePage />);

      const carousel = await region('Главное сейчас');
      await within(carousel).findByRole('group', { name: '1 из 3' });

      expect(within(carousel).queryByText(/\d{2}\s*\/\s*\d{2}/)).not.toBeInTheDocument();
    });

    it('листает стрелками по бокам на одну карточку', async () => {
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;
      renderWithProviders(<HomePage />);

      const carousel = await region('Главное сейчас');
      fireEvent.click(await within(carousel).findByRole('button', { name: 'Следующая карточка' }));
      fireEvent.click(within(carousel).getByRole('button', { name: 'Предыдущая карточка' }));

      expect(scrollBy).toHaveBeenCalledTimes(2);
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
      await searchSchedule(band, 'Чеканин');

      expect(await within(band).findByText(/всего найдено 2/)).toBeInTheDocument();
    });

    it('находит пары по группе и подписывает преподавателя', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      await searchSchedule(band, 'ИДБ-23-12');

      const found = await within(band).findByRole('tabpanel');
      expect(within(found).getByText('Базы данных')).toBeInTheDocument();
      expect(within(found).getByText(/Разумовский А\. И\./)).toBeInTheDocument();
      expect(within(found).getByText(/подгр\. А/)).toBeInTheDocument();
    });

    it('не показывает пары, пока запрос не отправлен', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      const input = await within(band).findByLabelText('Преподаватель или группа');
      fireEvent.change(input, { target: { value: 'Чеканин' } });

      expect(within(band).queryByText(/всего найдено/)).not.toBeInTheDocument();
      expect(within(band).queryByText(/Ничего не нашлось/)).not.toBeInTheDocument();

      fireEvent.submit(input.closest('form') as HTMLFormElement);

      expect(await within(band).findByText(/всего найдено 2/)).toBeInTheDocument();
    });

    it('пока набирают, подсказывает преподавателей кнопками', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      const input = await within(band).findByLabelText('Преподаватель или группа');
      await within(band).findByRole('button', { name: 'Чеканин В. А.' });
      fireEvent.change(input, { target: { value: 'Раз' } });

      expect(within(band).getByRole('button', { name: 'Разумовский А. И.' })).toBeInTheDocument();
      expect(within(band).queryByRole('button', { name: 'Чеканин В. А.' })).not.toBeInTheDocument();
    });

    it('очищенное поле убирает найденные пары', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      await searchSchedule(band, 'Чеканин');
      expect(await within(band).findByText(/всего найдено 2/)).toBeInTheDocument();

      fireEvent.change(within(band).getByLabelText('Преподаватель или группа'), {
        target: { value: '' },
      });

      expect(within(band).queryByText(/всего найдено/)).not.toBeInTheDocument();
    });

    it('сообщает, когда ничего не нашлось', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      await searchSchedule(band, 'несуществующая');

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

    describe('на широком экране', () => {
      beforeEach(() => {
        window.innerWidth = 1280;
      });

      afterEach(() => {
        window.innerWidth = 1024;
      });

      it('рисует неделю таблицей: дни в колонках, номера пар в строках', async () => {
        renderWithProviders(<HomePage />);

        const band = await region('Расписание');
        await searchSchedule(band, 'Чеканин');

        const table = await within(band).findByRole('table');
        expect(within(table).getByRole('columnheader', { name: /Понедельник/ })).toBeInTheDocument();
        expect(within(table).getByRole('columnheader', { name: /Среда/ })).toBeInTheDocument();
        expect(within(table).queryByRole('columnheader', { name: /Вторник/ })).not.toBeInTheDocument();

        expect(within(table).getByRole('rowheader', { name: /10:20/ })).toBeInTheDocument();
        expect(within(table).getByRole('rowheader', { name: /12:20/ })).toBeInTheDocument();
        expect(within(table).getByRole('rowheader', { name: /14:10/ })).toBeInTheDocument();

        expect(within(table).getByText('Технические средства информационных систем')).toBeInTheDocument();
        expect(within(table).getByText('Проектирование АСУ')).toBeInTheDocument();
        expect(within(band).getByText('Найдено 2 пары, неделя целиком')).toBeInTheDocument();
        expect(within(band).queryByRole('tablist')).not.toBeInTheDocument();
      });

      it('кладёт пару в ячейку своего дня и своей пары', async () => {
        renderWithProviders(<HomePage />);

        const band = await region('Расписание');
        await searchSchedule(band, 'Чеканин');

        const table = await within(band).findByRole('table');
        const row = within(table).getByRole('rowheader', { name: /14:10/ }).closest('tr');
        const cells = within(row as HTMLElement).getAllByRole('cell');

        expect(cells).toHaveLength(2);
        expect(cells[0]).toBeEmptyDOMElement();
        expect(within(cells[1]).getByText('Проектирование АСУ')).toBeInTheDocument();
      });

      it('склеивает подгруппы одной дисциплины в одну запись ячейки', async () => {
        server.use(
          ...scheduleHandlers([
            {
              teacherId: 3,
              teacherName: 'Чеканин Владимир Александрович',
              lessons: [
                makeLesson({ id: 1, weekNumber: 1, classTime: 1, subgroup: 'А', cabinet: '216' }),
                makeLesson({ id: 2, weekNumber: 1, classTime: 1, subgroup: 'Б', cabinet: '217' }),
              ],
            },
          ]),
        );
        renderWithProviders(<HomePage />);

        const band = await region('Расписание');
        await searchSchedule(band, 'Чеканин');

        const table = await within(band).findByRole('table');
        expect(within(table).getAllByText('Технические средства информационных систем')).toHaveLength(1);
        expect(within(table).getByText(/подгр\. А · ауд\. 216/)).toBeInTheDocument();
        expect(within(table).getByText(/подгр\. Б · ауд\. 217/)).toBeInTheDocument();
      });
    });

    it('на узком экране остаётся списком по дням', async () => {
      renderWithProviders(<HomePage />);

      const band = await region('Расписание');
      await searchSchedule(band, 'Чеканин');

      expect(await within(band).findByRole('tablist', { name: 'Дни недели' })).toBeInTheDocument();
      expect(within(band).queryByRole('table')).not.toBeInTheDocument();
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

  describe('быстрые ссылки', () => {
    it('ставят под первым экраном пять плиток с адресами разделов', async () => {
      renderWithProviders(<HomePage />);

      const tiles = await region('Быстрые ссылки');
      const hrefs = within(tiles)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'));

      expect(hrefs).toEqual([
        '/educational-activities/schedule/schedule-summary',
        '/educational-activities/schedule/schedule-exams',
        '#programs',
        '/about/employee/teachers',
        '/about/documents/department',
      ]);
    });

    it('«Учебные планы» открывает блок обучения на этой же странице', async () => {
      renderWithProviders(<HomePage />);

      const tiles = await region('Быстрые ссылки');
      expect(within(tiles).getByRole('link', { name: /Учебные планы/ })).toHaveAttribute(
        'href',
        '#programs',
      );
      expect(document.getElementById('programs')).not.toBeNull();
    });
  });

  describe('мероприятия', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('без переполнения стрелок нет', async () => {
      renderWithProviders(<HomePage />);

      const events = await region('Мероприятия');
      await within(events).findByRole('link', { name: /Конференция 1/ });

      expect(
        within(events).queryByRole('button', { name: 'Следующие мероприятия' }),
      ).not.toBeInTheDocument();
    });

    it('когда карточки не помещаются, показывает стрелки и листает вперёд', async () => {
      vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(3000);
      vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(1000);
      const scrollBy = vi.fn();
      HTMLElement.prototype.scrollBy = scrollBy;
      renderWithProviders(<HomePage />);

      const events = await region('Мероприятия');
      const next = await within(events).findByRole('button', { name: 'Следующие мероприятия' });
      const prev = within(events).getByRole('button', { name: 'Предыдущие мероприятия' });

      expect(prev).toBeDisabled();
      expect(next).toBeEnabled();

      fireEvent.click(next);

      expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: 800 }));
    });
  });
});
