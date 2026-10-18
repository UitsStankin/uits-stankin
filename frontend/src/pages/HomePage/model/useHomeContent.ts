import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { achievementListQuery } from '@entities/achievement';
import { conferenceListQuery } from '@entities/conference';
import { editablePageQuery } from '@entities/editable-page';
import { newsListQuery } from '@entities/news';
import { examSummaryQuery, scheduleSummaryQuery } from '@entities/schedule';
import { teachersListQuery } from '@entities/teacher';
import { newsItemRoute } from '@shared/config/routes';
import type { EditablePage, Page } from '@shared/types';

/**
 * Сколько записей брать в каждую выдачу.
 *
 * Пять новостей и четыре объявления — как в оригинале, где `home.service.ts`
 * просил ровно эти `limit`. Остальные списки — витрина: хватает горсти,
 * полный перечень лежит на странице раздела.
 */
const HOME_NEWS_SIZE = 5;
const HOME_ANNOUNCEMENTS_SIZE = 4;
const HOME_EVENTS_SIZE = 6;
const HOME_TEACHERS_SIZE = 8;

/** Разобранное состояние одной выдачи — то, что нужно разметке, и ничего больше. */
export interface HomeListState<T> {
  items: readonly T[];
  /** Сколько записей всего в разделе, а не на витрине. */
  total: number;
  /** Первая загрузка: показывать заглушку. */
  isLoading: boolean;
  /**
   * Запрос приостановлен, и показать пока нечего: нет сети либо вкладка
   * ушла в фон. Ветка отдельная по той же причине, что и в ленте: при паузе
   * не выставлены ни `isLoading`, ни `isError`, и без неё секция показывала бы
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
 * Состояние главной: два редактируемых блока, контакты и семь выдач.
 *
 * Запросы идут параллельно и намеренно не связаны: заставлять ленту ждать
 * блок, которого может не быть вовсе, незачем. Запросы мелкие, а `staleTime`
 * в пять минут гасит повторные заходы.
 *
 * Лента новостей и лента объявлений остаются двумя запросами, а не одним
 * смешанным: фильтра по типу у общего запроса нет, а склейка двух выдач
 * на клиенте дешевле второй ручки (`lib/timeline.ts`).
 *
 * Приятный побочный эффект: переход с главной в статью **не делает запроса**.
 * `findCachedNews` перебирает все списки под ключом `newsKeys.lists()`,
 * а списки главной — два из них.
 */
export function useHomeContent() {
  const before = useQuery(editablePageQuery('home-before'));
  const after = useQuery(editablePageQuery('home-after'));
  const contacts = useQuery(editablePageQuery('contacts'));

  const news = useQuery(newsListQuery({ size: HOME_NEWS_SIZE, postType: 'news' }));
  const announcements = useQuery(
    newsListQuery({ size: HOME_ANNOUNCEMENTS_SIZE, postType: 'announcements' }),
  );
  const conferences = useQuery(conferenceListQuery({ size: HOME_EVENTS_SIZE }));
  const achievements = useQuery(achievementListQuery({ size: HOME_EVENTS_SIZE }));
  const teachers = useQuery(teachersListQuery({ size: HOME_TEACHERS_SIZE }));
  const schedules = useQuery(scheduleSummaryQuery());
  const exams = useQuery(examSummaryQuery());

  return {
    before: blockText(before.data),
    after: blockText(after.data),
    contacts: blockText(contacts.data),

    news: pageState(news),
    announcements: pageState(announcements),
    conferences: pageState(conferences),
    achievements: pageState(achievements),
    teachers: pageState(teachers),
    schedules: listState(schedules),
    exams: listState(exams),

    hrefForItem: newsItemRoute,
  };
}

function baseState<T>(query: UseQueryResult<unknown>, items: readonly T[], total: number) {
  return {
    items,
    total,
    isLoading: query.isLoading,
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    isEmpty: query.isSuccess && total === 0,
    refetch: () => void query.refetch(),
  } satisfies HomeListState<T>;
}

/** Разбор запроса страницы: записи и общее число берутся из объекта-страницы. */
function pageState<T>(query: UseQueryResult<Page<T>>): HomeListState<T> {
  return baseState(query, query.data?.content ?? [], query.data?.totalElements ?? 0);
}

/** Разбор запроса без страниц: общее число — длина массива. */
function listState<T>(query: UseQueryResult<T[]>): HomeListState<T> {
  const items = query.data ?? [];
  return baseState(query, items, items.length);
}

/**
 * Текст блока — или `null`, если рисовать нечего.
 *
 * Схлопывает в одно «нечего» три разных случая, и это осознанный размен.
 *
 * Первый — блок пуст (`text: ""`). Это легальное значение по контракту
 * и означает «модератор ещё не заполнил», а не сбой. На чистой базе так
 * и есть у всех разделов: ченджсет `008-seed-editable-pages` заводит все
 * тринадцать с пустым текстом.
 *
 * Второй — блок ещё едет. Скелета под него нет намеренно: высота будущего
 * Markdown неизвестна, и любая заглушка угадывала бы её мимо, добавляя
 * второй скачок вёрстки к первому.
 *
 * Третий, и единственный спорный, — **запрос упал**. Ошибка проглатывается,
 * и это тоже решение, а не забытая ветка. Блок — необязательное обрамление:
 * посетитель, ни разу его не видевший, из надписи «не удалось загрузить
 * блок» ничего не извлечёт. А если лежит бэкенд целиком, он узнает об этом
 * от секций, у которых состояния сбоя показаны все.
 */
function blockText(page: EditablePage | undefined): string | null {
  // trim: строка из одних пробелов и переводов строки — то же «не заполнено»,
  // но рисует пустую карточку с отступами.
  const text = page?.text.trim();
  return text ? text : null;
}
