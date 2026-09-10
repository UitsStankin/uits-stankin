import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { POST_TYPES, allNewsListQuery } from '@entities/news';
import { useDeleteNews } from '@features/manage-news';
import { ADMIN_NEWS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { News, PostType } from '@shared/types';

/**
 * Имя параметра с фильтром по типу записи — контрактное (`?postType=`),
 * то есть в адресе страницы и в строке запроса лежит побайтово одно и то
 * же, и переводить одно в другое не нужно. Тем же правилом живут номер
 * страницы, порядок сортировки и поиск (`shared/lib`).
 */
const TYPE_PARAM = 'postType';

/**
 * Колонки, по которым список сортируется.
 *
 * Одна, и это не упущение. Сортировка у нас одноколоночная (`sortParam.ts`),
 * а у контракта последним ключом порядка везде идёт уникальное поле —
 * без него записи с одинаковым значением при листании приходят одна дважды,
 * другая ни разу (docs/API.md, «Пагинация списков»). У даты совпадения
 * практически исключены — она с микросекундами, — а у заголовка нет:
 * «Расписание сессии» кафедра публикует каждый семестр. Поэтому дата
 * сортируется, а заголовок — нет.
 */
const SORTABLE_FIELDS = ['createdAt'] as const;

/**
 * Порядок по умолчанию — тот же, что у контракта (`@PageableDefault(sort =
 * {"createdAt", "id"}, direction = DESC)`). Совпадение не случайно: пока
 * порядок совпадает, параметра в адресе нет вовсе, запрос уходит без `sort`
 * и получает от Spring его собственное умолчание — вместе с ключом `id`,
 * которого одноколоночный параметр не выражает.
 */
const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

/** Что сейчас правится: существующая запись, новая или ничего. */
type Editing = { news: News | null } | null;

/**
 * Раздел новостей и объявлений: что показано, что открыто и что нажали.
 * Разметка об этом ничего не знает.
 *
 * **Страница, порядок и фильтр живут в адресе**, а не в `useState`. Список
 * пересылают ссылкой и возвращаются в него кнопкой «назад» — по тем же
 * причинам, по которым в адрес вынесен номер страницы у публичных списков
 * (`shared/lib/pageParam.ts`).
 *
 * **Что правится — наоборот, в состоянии компонента.** Открытое окно формы
 * не адрес: перезагрузка страницы с `?edit=3` обязана была бы дождаться
 * списка и найти в нём запись. Ручка чтения одной записи у контракта есть
 * (`GET /api/news/{id}`), но звать её незачем: списочная и детальная
 * отдают **один и тот же DTO**, то есть строка таблицы — это уже вся запись
 * целиком, вместе с содержанием.
 */
export function useNewsAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);
  const postType = parsePostType(searchParams.get(TYPE_PARAM));

  /**
   * Порядок, отличный от умолчания. `null` означает «не задавать вовсе» —
   * и в адресе, и **в запросе**.
   *
   * В запросе это важнее, чем в адресе: `?sort=createdAt,desc` — не то же
   * самое, что отсутствие параметра. Заданный порядок заменяет умолчание
   * контракта целиком, вместе с ключом `id`, который идёт в нём вторым
   * и делает листание устойчивым. Отправляя свой «такой же» порядок,
   * список получил бы записи с одинаковой датой в неопределённом порядке —
   * и одна приходила бы на двух страницах, а другая ни на одной.
   */
  const sortInRequest = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(
    allNewsListQuery({
      page: page - 1,
      sort: sortInRequest ?? undefined,
      postType: postType ?? undefined,
    }),
  );

  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<News | null>(null);

  const { remove, isPending: isDeleting } = useDeleteNews(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  /**
   * Адрес списка: страница, порядок и фильтр вместе. Один сборщик на всё,
   * что рисует ссылки, — пагинатор, переключатель типа и переход после
   * клика по заголовку: иначе адреса разошлись бы экранированием запятой
   * в значении сортировки.
   */
  const listHref = (target: number, type: PostType | null, sort: string | null) =>
    pageHref(ADMIN_NEWS_ROUTE, target, { [SORT_PARAM]: sort, [TYPE_PARAM]: type });

  return {
    news: data ? [...data.content] : [],
    page,
    totalPages,
    sorting,
    /** Какой тип показан; `null` — оба. Нужен подписям пустого списка. */
    postType,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: таблица притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Записей нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) => listHref(target, postType, sortInRequest),

    /**
     * Смена фильтра сбрасывает страницу — по той же причине, что и смена
     * порядка: третья страница смешанного списка не имеет отношения
     * к списку объявлений, и оставленный номер показал бы пустоту или
     * не то, что искали.
     */
    hrefForType: (type: PostType | null) => listHref(1, type, sortInRequest),

    /**
     * Смена порядка сбрасывает страницу и сохраняет фильтр. Здесь тот же
     * сборщик адреса, а не правка `searchParams`: адрес раздела собирается
     * одним способом, иначе ссылки пагинатора и адрес после клика
     * по заголовку отличались бы экранированием запятой.
     */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(listHref(1, postType, value === DEFAULT_SORT ? null : value));
    },

    editing,
    startCreate: () => setEditing({ news: null }),
    startEdit: (news: News) => setEditing({ news }),
    closeEditor: () => setEditing(null),

    deleting,
    askDelete: (news: News) => setDeleting(news),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}

/**
 * Тип записи из адреса; `null` — фильтра нет, показываем оба.
 *
 * Значение вне словаря приравнено к «оба», а не отправлено в запрос как
 * есть: контракт отвечает на такое `400`, и чужая ссылка с опечаткой
 * ломала бы страницу вместо того, чтобы показать её без фильтра. То же
 * правило у разбора порядка сортировки (`shared/lib/sortParam.ts`).
 */
function parsePostType(raw: string | null): PostType | null {
  return POST_TYPES.find((type) => type === raw) ?? null;
}
