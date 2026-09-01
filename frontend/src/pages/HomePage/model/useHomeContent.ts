import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { editablePageQuery } from '@entities/editable-page';
import { newsListQuery } from '@entities/news';
import { newsItemRoute } from '@shared/config/routes';
import type { EditablePage, News, NewsPage } from '@shared/types';

/**
 * Сколько записей показывать в каждой секции.
 *
 * Пять и четыре — как в оригинале, где `home.service.ts` просил ровно эти
 * `limit`. Разные числа не оговорка: секции стоят одна под другой, и равная
 * длина превратила бы их в один список, разделённый заголовком.
 */
const HOME_NEWS_SIZE = 5;
const HOME_ANNOUNCEMENTS_SIZE = 4;

/** Разобранное состояние одной секции — то, что нужно разметке, и ничего больше. */
export interface HomeFeedState {
  items: readonly News[];
  /** Первая загрузка: показывать скелет. */
  isLoading: boolean;
  /**
   * Запрос приостановлен, и показать пока нечего: нет сети либо вкладка
   * ушла в фон. Ветка отдельная по той же причине, что и в ленте: при паузе
   * не выставлены ни `isLoading`, ни `isError`, и без неё главная показывала бы
   * заголовок над пустотой. Подробный разбор — в
   * `widgets/NewsFeed/model/useNewsList.ts`.
   */
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  /** Записей нет вовсе. */
  isEmpty: boolean;
  refetch: () => void;
}

/**
 * Состояние главной: два редактируемых блока и две секции записей.
 *
 * Четыре запроса идут параллельно и намеренно не связаны: лента — то, ради
 * чего на главную заходят, и заставлять её ждать блок, которого может
 * не быть вовсе, незачем. Запросы мелкие, а `staleTime` в пять минут гасит
 * повторные заходы.
 *
 * Секции две, а не одна смешанная, — как в оригинале. Второй `useQuery`
 * прямо здесь, а не общий хук «лента по типу»: на главной нет ни пагинации,
 * ни номера страницы в адресе, и общего с `useNewsList` у неё ровно один
 * запрос — абстракция на два места здесь дороже дубля.
 *
 * Приятный побочный эффект, за который не заплачено ни строкой: переход
 * с главной в статью **не делает запроса**. `findCachedNews` перебирает все
 * списки под ключом `newsKeys.lists()`, а списки главной — два из них.
 */
export function useHomeContent() {
  const before = useQuery(editablePageQuery('home-before'));
  const after = useQuery(editablePageQuery('home-after'));

  // Только `size` и `postType`: `page` по умолчанию нулевая, а лишний
  // `?page=0` в запросе ничего не уточняет. Сортировка тоже умолчанием —
  // новые сверху.
  const news = useQuery(newsListQuery({ size: HOME_NEWS_SIZE, postType: 'news' }));
  const announcements = useQuery(
    newsListQuery({ size: HOME_ANNOUNCEMENTS_SIZE, postType: 'announcements' }),
  );

  return {
    before: blockText(before.data),
    after: blockText(after.data),

    news: feedState(news),
    announcements: feedState(announcements),

    hrefForItem: newsItemRoute,
  };
}

/**
 * Разбор одного запроса секции. Общий на обе: состояния у них одинаковые
 * до последнего поля, и вторая копия этих семи строк разошлась бы с первой
 * на первой же правке.
 */
function feedState(query: UseQueryResult<NewsPage>): HomeFeedState {
  return {
    items: query.data?.content ?? [],
    isLoading: query.isLoading,
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    isEmpty: query.isSuccess && query.data !== undefined && query.data.totalElements === 0,
    refetch: () => void query.refetch(),
  };
}

/**
 * Текст блока — или `null`, если рисовать нечего.
 *
 * Схлопывает в одно «нечего» три разных случая, и это осознанный размен.
 *
 * Первый — блок пуст (`text: ""`). Это легальное значение по контракту
 * и означает «модератор ещё не заполнил», а не сбой. На чистой базе так
 * и есть у обоих блоков: ченджсет `008-seed-editable-pages` заводит все
 * тринадцать разделов с пустым текстом, и никто их с тех пор не трогал —
 * в старом портале эти два слага были объявлены в `DEFAULT_EDITABLE_PAGES`
 * и не использовались нигде.
 *
 * Второй — блок ещё едет. Скелета под него нет намеренно: высота будущего
 * Markdown неизвестна, и любая заглушка угадывала бы её мимо, добавляя
 * второй скачок вёрстки к первому.
 *
 * Третий, и единственный спорный, — **запрос упал**. Ошибка проглатывается,
 * и это тоже решение, а не забытая ветка. Блок — необязательное обрамление
 * ленты: посетитель, ни разу его не видевший, из надписи «не удалось
 * загрузить блок» ничего не извлечёт и ничего не сможет сделать. А если
 * лежит бэкенд целиком, он узнает об этом от секций, у которых состояния
 * сбоя показаны все. Цена размена — молчаливо пропавший блок при `500`
 * на одной ручке из четырёх; она признана меньшей, чем тревожная плашка
 * на главной вместо текста, которого там и так может не быть.
 */
function blockText(page: EditablePage | undefined): string | null {
  // trim: строка из одних пробелов и переводов строки — то же «не заполнено»,
  // но рисует пустую белую карточку с отступами.
  const text = page?.text.trim();
  return text ? text : null;
}
