import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { teachersListQuery } from '@entities/teacher';
import { useDeleteTeacher } from '@features/manage-teachers';
import { ADMIN_TEACHERS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { TeacherListItem } from '@shared/types';

/**
 * Колонки, по которым список сортируется.
 *
 * Три поля карточки, все они есть у сущности бэкенда, и `sort` принимает
 * именно их (docs/API.md, «Преподаватели»: «в `sort` передаются поля
 * карточки»; путь `user.lastName` перестал работать с T-26). Степень
 * и звание не сортируются намеренно: в базе это коды словаря, и порядок
 * вышел бы по строке `CANDIDATE_ECONOM`, а не по смыслу подписи.
 */
const SORTABLE_FIELDS = ['lastName', 'firstName', 'position'] as const;

/**
 * Порядок по умолчанию — тот же, что у контракта (`@PageableDefault(sort =
 * {"lastName", "firstName", "id"})`). Совпадение не случайно: пока порядок
 * совпадает, параметра в адресе нет вовсе, запрос уходит без `sort`
 * и получает от Spring его собственное умолчание — вместе с ключами
 * `firstName` и `id`, которых одноколоночный параметр не выражает.
 */
const DEFAULT_SORTING: SortingState = [{ id: 'lastName', desc: false }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

/**
 * Раздел преподавателей: что показано и что нажали. Разметка об этом
 * ничего не знает.
 *
 * **Страница и порядок живут в адресе**, а не в `useState`: список
 * пересылают ссылкой и возвращаются в него кнопкой «назад».
 *
 * **Формы правки здесь нет вовсе** — в отличие от новостей и дисциплин.
 * Она живёт своей страницей (`adminTeacherRoute`), потому что списочная
 * ручка отдаёт короткую карточку и форме всё равно нужен свой запрос:
 * разбор в `shared/config/routes.ts`. Раздел поэтому знает только про
 * удаление, а «править» здесь — обычная ссылка.
 *
 * Читается **публичная** ручка: модераторского списка карточек ППС
 * в контракте нет, а скрытых карточек не бывает — прятать модератору
 * нечего.
 */
export function useTeachersAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);

  /**
   * Порядок, отличный от умолчания. `null` означает «не задавать вовсе» —
   * и в адресе, и **в запросе**.
   *
   * В запросе это важнее, чем в адресе: `?sort=lastName,asc` — не то же
   * самое, что отсутствие параметра. Заданный порядок заменяет умолчание
   * контракта целиком, вместе с ключами `firstName` и `id`, которые идут в нём следом и делают листание
   * устойчивым. Отправляя свой «такой же» порядок, список получил бы
   * однофамильцев в неопределённом порядке — и один приходил бы на двух
   * страницах, а другой ни на одной.
   */
  const sortInRequest = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(teachersListQuery({ page: page - 1, sort: sortInRequest ?? undefined }));

  const [deleting, setDeleting] = useState<TeacherListItem | null>(null);
  const { remove, isPending: isDeleting } = useDeleteTeacher(() => setDeleting(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;


  return {
    teachers: data ? [...data.content] : [],
    page,
    totalPages,
    sorting,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: таблица притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Карточек нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) =>
      pageHref(ADMIN_TEACHERS_ROUTE, target, { [SORT_PARAM]: sortInRequest }),

    /**
     * Смена порядка сбрасывает страницу: третья страница прежнего порядка
     * не имеет отношения к новому, и оставленный номер показал бы карточки,
     * которых человек не искал.
     */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(
        pageHref(ADMIN_TEACHERS_ROUTE, 1, { [SORT_PARAM]: value === DEFAULT_SORT ? null : value }),
      );
    },

    deleting,
    askDelete: (teacher: TeacherListItem) => setDeleting(teacher),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    isDeleting,
  };
}
