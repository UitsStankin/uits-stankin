import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { adminTeachersListQuery } from '@entities/teacher';
import { useArchiveTeacher, useDeleteTeacher } from '@features/manage-teachers';
import { ADMIN_TEACHERS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SORT_PARAM, pageHref, parsePage, parseSort, sortParam } from '@shared/lib';
import type { TeacherListItem } from '@shared/types';

/**
 * Колонки, по которым список сортируется.
 *
 * Два поля карточки, оба есть у сущности бэкенда, и `sort` принимает
 * именно их (docs/API.md, «Преподаватели»: «в `sort` передаются поля
 * карточки»; путь `user.lastName` перестал работать с T-26).
 *
 * `firstName` был третьим и ушёл вместе со своей колонкой: показывать
 * имя отдельным столбцом нечего — оно в ФИО, — а вторым ключом порядка
 * оно и так стоит. Старая ссылка с `?sort=firstName,asc` от этого
 * не ломается: незнакомое поле `parseSort` заменяет умолчанием, и список
 * открывается в обычном порядке вместо `400` от Spring.
 *
 * Степень и звание не сортируются намеренно: в базе это коды словаря,
 * и порядок вышел бы по строке `CANDIDATE_ECONOM`, а не по смыслу
 * подписи.
 */
const SORTABLE_FIELDS = ['lastName', 'position'] as const;

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
 * Какие карточки показаны: действующие, архивные или все.
 *
 * По умолчанию — **действующие**, а не все: раздел нужен прежде всего,
 * чтобы править тех, кто работает, и архив, растущий год от года, не должен
 * разбавлять таблицу. Архивная карточка при этом не теряется — она в своём
 * отборе, и вернуть её можно оттуда.
 */
export type ArchiveView = 'active' | 'archived' | 'all';

/**
 * Параметр адреса — `archived`, как у контракта, и `?archived=true`
 * лежит в адресе и в запросе побайтово одинаково. Расходятся два случая,
 * и оба из-за умолчания: действующие — это отсутствие параметра в адресе
 * (а в запросе `archived=false`), все — `?archived=all` в адресе (а в
 * запросе параметра нет). Незнакомое значение — действующие: битая ссылка
 * открывает раздел в обычном виде, а не `400` от Spring.
 */
const ARCHIVE_PARAM = 'archived';

function parseArchiveView(raw: string | null): ArchiveView {
  if (raw === 'true') return 'archived';
  if (raw === 'all') return 'all';

  return 'active';
}

const ARCHIVE_URL_VALUE: Record<ArchiveView, string | null> = {
  active: null,
  archived: 'true',
  all: 'all',
};

const ARCHIVE_REQUEST_VALUE: Record<ArchiveView, boolean | undefined> = {
  active: false,
  archived: true,
  all: undefined,
};

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
 * удаление и архив, а «править» здесь — обычная ссылка.
 *
 * Читается **защищённая** ручка `GET /api/teachers` (F-53): публичная
 * архивных не отдаёт, и заархивированная карточка пропала бы из админки
 * без пути назад. Отбор по архиву — в адресе, рядом со страницей
 * и порядком.
 */
export function useTeachersAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);
  const view = parseArchiveView(searchParams.get(ARCHIVE_PARAM));

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
  const query = useQuery(
    adminTeachersListQuery({
      page: page - 1,
      sort: sortInRequest ?? undefined,
      archived: ARCHIVE_REQUEST_VALUE[view],
    }),
  );

  const [deleting, setDeleting] = useState<TeacherListItem | null>(null);
  const { remove, isPending: isDeleting } = useDeleteTeacher(() => setDeleting(null));
  const { archive, unarchive } = useArchiveTeacher();

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  /**
   * Адрес списка: страница, порядок и отбор вместе. Один сборщик на всё,
   * что рисует ссылки, — как у новостей: иначе адреса разошлись бы.
   */
  const listHref = (target: number, nextView: ArchiveView, sort: string | null) =>
    pageHref(ADMIN_TEACHERS_ROUTE, target, {
      [SORT_PARAM]: sort,
      [ARCHIVE_PARAM]: ARCHIVE_URL_VALUE[nextView],
    });

  return {
    teachers: data ? [...data.content] : [],
    page,
    totalPages,
    sorting,
    /** Какие карточки показаны. Нужен подписям пустого списка. */
    view,

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

    hrefForPage: (target: number) => listHref(target, view, sortInRequest),

    /**
     * Смена отбора сбрасывает страницу — как смена порядка: третья
     * страница действующих не имеет отношения к архиву.
     */
    hrefForView: (nextView: ArchiveView) => listHref(1, nextView, sortInRequest),

    /**
     * Смена порядка сбрасывает страницу: третья страница прежнего порядка
     * не имеет отношения к новому, и оставленный номер показал бы карточки,
     * которых человек не искал.
     */
    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(listHref(1, view, value === DEFAULT_SORT ? null : value));
    },

    deleting,
    askDelete: (teacher: TeacherListItem) => setDeleting(teacher),
    cancelDelete: () => setDeleting(null),
    confirmDelete: () => {
      if (deleting) remove(deleting);
    },
    /**
     * Архив из окна удаления — штатный путь для ушедшего преподавателя
     * (docs/API.md, «Архив»). Окно закрывается сразу: у архива свой тост,
     * а держать открытым окно с красной кнопкой незачем.
     */
    archiveInsteadOfDelete: () => {
      if (!deleting) return;

      archive(deleting);
      setDeleting(null);
    },
    isDeleting,

    archive,
    unarchive,
  };
}
