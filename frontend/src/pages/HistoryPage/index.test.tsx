import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import HistoryPage from './index';

function renderPage() {
  return renderWithProviders(<HistoryPage />, { route: '/about/history-of-department' });
}

/** Карточка события целиком — по её заголовку. */
function cardOf(title: string | RegExp): HTMLElement {
  const card = screen.getByRole('heading', { level: 2, name: title }).closest('article');
  if (card === null) throw new Error(`Карточка «${String(title)}» не найдена`);
  return card;
}

/**
 * Полоса прочитанного. Единственный `div` с `aria-hidden` на странице:
 * шкала и точки на ней — `span`, иконки событий — `svg`.
 */
function progressBar(container: HTMLElement): HTMLElement {
  const bar = container.querySelector('div[aria-hidden]');
  if (bar === null) throw new Error('Полоса прочитанного не найдена');
  return bar as HTMLElement;
}

const windowScrollY = Object.getOwnPropertyDescriptor(window, 'scrollY');
const windowInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');

/**
 * Прокрутка окна: в jsdom страницы нет высоты вовсе, все три величины
 * приходится задавать руками. Событие — то же, на которое подписан хук.
 */
function scrollWindowTo({
  scrollY,
  pageHeight,
  viewportHeight,
}: {
  scrollY: number;
  pageHeight: number;
  viewportHeight: number;
}) {
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    value: pageHeight,
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewportHeight });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });

  fireEvent.scroll(window);
}

afterEach(() => {
  // Окно — общее на весь файл, подменённые размеры уехали бы в соседний тест.
  Reflect.deleteProperty(document.documentElement, 'scrollHeight');
  if (windowScrollY) Object.defineProperty(window, 'scrollY', windowScrollY);
  if (windowInnerHeight) Object.defineProperty(window, 'innerHeight', windowInnerHeight);
});

/**
 * Страница истории. Данных у неё нет, запросов тоже — проверять тут нечего,
 * кроме того, ради чего тикет и заводился: содержимое доехало целиком,
 * в правильном порядке, и решения, принятые при переносе, не отменены
 * следующей правкой втихую.
 */
describe('HistoryPage', () => {
  it('показывает заголовок страницы и подзаголовок', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'История кафедры' })).toBeInTheDocument();
    expect(
      screen.getByText(/Кафедра управления и информатики в технических системах/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/От биотехнической кибернетики к интеллектуальному анализу данных/),
    ).toBeInTheDocument();
  });

  /**
   * Десять событий по годам. Порядок проверяется целиком, а не наличие
   * каждого по отдельности: лента — это последовательность, и событие,
   * уехавшее из своего десятилетия, ломает ровно её.
   */
  it('выкладывает десять событий по порядку', () => {
    renderPage();

    const titles = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent);

    expect(titles).toEqual([
      'Создание научного центра и кафедры',
      'Реорганизация и научные достижения',
      'Коллектив кафедры биотехнической кибернетики в 2010 году',
      'Выпускающая кафедра',
      'Партнёрство с оборонно-промышленным комплексом',
      'Первые выпуски',
      'Управление данными',
      'Эра искусственного интеллекта и международного сотрудничества',
      'Коллектив кафедры управления и информатики в технических системах в 2023 году',
      'Интеллектуальный анализ данных и современные исследования',
    ]);
  });

  it('подписывает событие годом или периодом', () => {
    renderPage();

    expect(within(cardOf('Создание научного центра и кафедры')).getByText('2003–2004')).toBeInTheDocument();
    expect(within(cardOf('Выпускающая кафедра')).getByText('2011')).toBeInTheDocument();
    expect(
      within(cardOf('Интеллектуальный анализ данных и современные исследования')).getByText('2022–2025'),
    ).toBeInTheDocument();
  });

  /**
   * Правка оригинала, а не его перенос: там у этой карточки на шкале стоял
   * «2010» — год соседней фотографии, — хотя её собственный заголовок
   * говорит про 2023-й. Проверка держит правку: вернувшийся «2010»
   * покажется в ленте дважды.
   */
  it('у фотографии 2023 года стоит её год, а не год соседней', () => {
    renderPage();

    const card = cardOf(/в 2023 году$/);
    expect(within(card).getByText('2023')).toBeInTheDocument();
    expect(within(card).queryByText('2010')).not.toBeInTheDocument();
    expect(screen.getAllByText('2010')).toHaveLength(1);
  });

  /**
   * Подписи снимков. В оригинале обе были «Персонал кафедры УИТС» —
   * то есть для читающего с экрана два разных снимка не отличались никак.
   */
  it('подписывает обе фотографии по-разному и по существу', () => {
    renderPage();

    const alts = screen.getAllByRole('img').map((image) => image.getAttribute('alt'));

    expect(alts).toEqual([
      'Общая фотография сотрудников кафедры биотехнической кибернетики, 2010 год',
      'Общая фотография сотрудников кафедры управления и информатики в технических системах, 2023 год',
    ]);
  });

  /**
   * Текст события — Markdown, а не строка: выделенные в оригинале имена
   * и названия обязаны доехать разметкой. Если текст выведут как есть,
   * на странице появятся звёздочки, и тест это поймает.
   */
  it('рисует выделенные места разметкой, а не звёздочками', () => {
    renderPage();

    const card = cardOf('Создание научного центра и кафедры');

    expect(within(card).getByText('д-р техн. наук, профессор Е.Е. Ковшов').tagName).toBe('STRONG');
    expect(within(card).queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it('показывает метки события списком', () => {
    renderPage();

    const tags = within(cardOf('Первые выпуски'))
      .getAllByRole('listitem')
      .map((item) => item.textContent);

    expect(tags).toEqual(['Первый выпуск', 'Магистратура ИВТ', 'Расширение программ']);
  });

  /**
   * Плитка «22 года развития» с четырьмя числами не перенесена намеренно —
   * причина в шапке `index.tsx`. Проверка стоит здесь, чтобы числа
   * не вернулись в код следующей правкой мимо этого разговора: вернуть
   * их можно, но данными и с подтверждением заказчика.
   */
  it('не показывает плитку чисел из оригинала', () => {
    renderPage();

    expect(screen.queryByText(/22 года развития/)).not.toBeInTheDocument();
    expect(screen.queryByText('Выпускников')).not.toBeInTheDocument();
    expect(screen.queryByText('Образовательных программ')).not.toBeInTheDocument();
  });

  /**
   * Полоса прочитанного. Проверяется связь «событие окна → ширина»:
   * сама арифметика разобрана в `lib/scrollProgress.test.ts`, а здесь —
   * что хук на это событие вообще подписан.
   */
  it('ведёт полосу прочитанного за прокруткой окна', () => {
    const { container } = renderPage();
    const bar = progressBar(container);

    // Первый кадр: в jsdom высоты у документа нет, прокручивать нечего.
    expect(bar).toHaveStyle({ width: '0%' });

    scrollWindowTo({ scrollY: 2000, pageHeight: 5000, viewportHeight: 1000 });
    expect(bar).toHaveStyle({ width: '50%' });

    scrollWindowTo({ scrollY: 4000, pageHeight: 5000, viewportHeight: 1000 });
    expect(bar).toHaveStyle({ width: '100%' });
  });
});
