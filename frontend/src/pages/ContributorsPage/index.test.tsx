import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { renderWithProviders } from '@/test/render';

import ContributorsPage from './index';

function renderPage() {
  return renderWithProviders(<ContributorsPage />, { route: '/about/contributors' });
}

/** Карточка человека целиком — по его имени. */
function cardOf(name: string): HTMLElement {
  const card = screen.getByRole('heading', { level: 2, name }).closest('article');
  if (card === null) throw new Error(`Карточка «${name}» не найдена`);
  return card;
}

/**
 * Снимки — через DOM, а не `getAllByRole('img')`.
 *
 * Роль `img` у картинки с пустым `alt` не остаётся: ARIA отображает такую
 * в `presentation`, и по роли её не найти вовсе — ровно то, чего мы
 * и добивались. `hidden: true` тут не помогает, это про `aria-hidden`
 * и видимость, а не про подмену роли.
 */
function photosIn(root: HTMLElement): HTMLImageElement[] {
  return Array.from(root.querySelectorAll('img'));
}

/**
 * Страница благодарностей. Запросов у неё нет и не будет, состояний тоже —
 * проверять тут нечего, кроме того, ради чего тикет и заводился:
 * содержимое доехало целиком и в том же порядке, а решения, принятые
 * при переносе, не отменены следующей правкой втихую.
 */
describe('ContributorsPage', () => {
  /**
   * В оригинале страница начиналась с `h3` и другого заголовка не имела:
   * по заголовкам к ней было не перейти. Проверяется и уровень, и то,
   * что фраза оригинала не потерялась при появлении `h1`.
   */
  it('называется как пункт меню, а фразу оригинала оставляет подписью', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Благодарности' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Выражаем огромную благодарность всем, кто принимал участие в создании портала кафедры',
      ),
    ).toBeInTheDocument();
  });

  /**
   * Шестнадцать человек по порядку — целиком, а не по одному. Список
   * благодарностей тем и ценен, что полный: выпавшего из него заметит
   * он сам, а не сборка.
   */
  it('перечисляет шестнадцать человек в порядке оригинала', () => {
    renderPage();

    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);

    expect(names).toEqual([
      'Чеканин Владислав Александрович',
      'Малова Яна',
      'Ерин Сергей',
      'Медведев Вадим',
      'Вдовенко Данил',
      'Осипова Ксения',
      'Вежновец Дмитрий',
      'Рябцев Михаил',
      'Шостов Дмитрий',
      'Лебедев Александр',
      'Мокроусова Лариса',
      'Станьков Дмитрий',
      'Бадян Ксения и Анастасия',
      'Золотухин Иван',
      'Мальцев Тимофей',
      'Вьев Сергей',
    ]);
  });

  it('подписывает роль в работе над порталом', () => {
    renderPage();

    expect(within(cardOf('Чеканин Владислав Александрович')).getByText('Руководитель')).toBeInTheDocument();
    expect(within(cardOf('Малова Яна')).getByText('Тимлид, fullstack-разработчик')).toBeInTheDocument();
    expect(within(cardOf('Вдовенко Данил')).getByText('Devops, ревьюер кода')).toBeInTheDocument();
  });

  /**
   * Шестеро без своего снимка получают общую заглушку портала — ту же,
   * что пользователь без аватара. В оригинале это делалось константой
   * прямо в данных; здесь подставляет карточка, и проверка сторожит,
   * что подстановка есть, а не пустой `src` с битой картинкой.
   */
  it('шестерым без фотографии подставляет общую заглушку портала', () => {
    const { container } = renderPage();

    const sources = photosIn(container).map((image) => image.getAttribute('src'));

    expect(sources).toHaveLength(16);
    expect(sources.filter((src) => src === DEFAULT_AVATAR_URL)).toHaveLength(6);
    expect(photosIn(cardOf('Ерин Сергей'))[0]).toHaveAttribute('src', DEFAULT_AVATAR_URL);
    expect(photosIn(cardOf('Малова Яна'))[0]).toHaveAttribute(
      'src',
      '/assets/images/contributors/malova-iana.jpg',
    );
  });

  /**
   * Снимок декоративный: имя стоит подписью под ним. В оригинале в `alt`
   * подставлялось то же имя, и диктор читал его дважды. Проверка держит
   * решение — вернуть `alt` с именем было бы легко и незаметно.
   */
  it('держит снимки декоративными, а не дублирует ими имя', () => {
    const { container } = renderPage();

    expect(photosIn(container).every((image) => image.getAttribute('alt') === '')).toBe(true);
    expect(screen.queryByAltText('Малова Яна')).not.toBeInTheDocument();
    // Для запроса по роли этих картинок не существует вовсе — ровно то,
    // чего мы и добивались: диктор пройдёт мимо них к подписи.
    expect(screen.queryAllByRole('img', { hidden: true })).toHaveLength(0);
  });

  /**
   * Шестнадцать снимков; без `lazy` они уезжают в сеть все разом ещё
   * до первого экрана, а без размеров сетка прыгает, пока они доезжают.
   * Оригинал не ставил ни того, ни другого.
   */
  it('откладывает снимки и занимает место под них заранее', () => {
    const { container } = renderPage();

    for (const image of photosIn(container)) {
      expect(image).toHaveAttribute('loading', 'lazy');
      expect(image).toHaveAttribute('width');
      expect(image).toHaveAttribute('height');
    }
  });

  /**
   * Карусель оригинала не должна вернуться незаметно: её кнопки
   * назывались `<` и `>` буквально, диктор так их и читал, а с клавиатуры
   * ленту было не сдвинуть. Разбор — в `ui/ContributorGrid`.
   */
  it('показывает список сеткой, без кнопок прокрутки', () => {
    renderPage();

    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getAllByRole('listitem')).toHaveLength(16);
  });
});
