import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';

import { usersListQuery } from '@entities/user';
import { useAuth } from '@features/auth';
import { useTerminateSessions } from '@features/manage-users';
import { ADMIN_USERS_ROUTE } from '@shared/config/routes';
import {
  PAGE_PARAM,
  SEARCH_PARAM,
  SORT_PARAM,
  pageHref,
  parsePage,
  parseSearch,
  parseSort,
  sortParam,
  useUrlSearch,
} from '@shared/lib';
import type { AdminUser, UserRole } from '@shared/types';

/** Имена отборов — контрактные (`?role=`, `?active=`), как у новостей `postType`. */
const ROLE_PARAM = 'role';
const ACTIVE_PARAM = 'active';

const ROLES: readonly UserRole[] = ['admin', 'moderator', 'teacher', 'user'];

/** Отбор по состоянию: строка из адреса, как она и уходит в запрос. */
export type ActiveFilter = 'true' | 'false';

/**
 * Колонки, по которым список сортируется: логин и дата заведения.
 *
 * Обе уникальны на практике — логин по контракту, дата с микросекундами, —
 * поэтому одноколоночный порядок листается устойчиво (разбор у новостей,
 * `useNewsAdmin`). Фамилия — нет: однофамильцы на кафедре бывают,
 * и учётка с одинаковой фамилией приходила бы на двух страницах сразу.
 * Последний вход — тоже нет: у ни разу не входивших он `null`, и куда
 * их ставит сервер, контракт не обещает.
 */
const SORTABLE_FIELDS = ['username', 'dateJoined'] as const;

/**
 * Порядок по умолчанию — как у контракта (`username`, затем `id`). Пока
 * совпадает, параметра нет ни в адресе, ни в запросе.
 */
const DEFAULT_SORTING: SortingState = [{ id: 'username', desc: false }];
const DEFAULT_SORT = sortParam(DEFAULT_SORTING);

type Editing = { user: AdminUser | null } | null;

/**
 * Раздел учётных записей: что показано, что открыто и что нажали.
 *
 * Страница, порядок, поиск и оба отбора живут в адресе — по тем же
 * причинам, что у остальных списков админки. Что правится — в состоянии
 * компонента: строка списка и есть вся учётка, догружать нечего.
 */
export function useUsersAdmin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const search = useUrlSearch();

  const page = parsePage(searchParams.get(PAGE_PARAM));
  const sorting = parseSort(searchParams.get(SORT_PARAM), SORTABLE_FIELDS, DEFAULT_SORTING);
  const q = parseSearch(searchParams.get(SEARCH_PARAM));
  const role = parseRole(searchParams.get(ROLE_PARAM));
  const active = parseActive(searchParams.get(ACTIVE_PARAM));

  const sortInRequest = sortParam(sorting) === DEFAULT_SORT ? null : sortParam(sorting);

  const query = useQuery(
    usersListQuery({
      page: page - 1,
      sort: sortInRequest ?? undefined,
      q: q === '' ? undefined : q,
      role: role ?? undefined,
      active: active === null ? undefined : active === 'true',
    }),
  );

  const [editing, setEditing] = useState<Editing>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [terminating, setTerminating] = useState<AdminUser | null>(null);

  const { terminate, isPending: isTerminating } = useTerminateSessions(() => setTerminating(null));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;
  const isFiltered = q !== '' || role !== null || active !== null;

  /**
   * Адрес списка. Один сборщик на пагинатор, оба отбора и клик
   * по заголовку — иначе адреса разошлись бы экранированием запятой.
   * Поиск в нём тоже есть: перелистывание обязано его сохранять.
   */
  const listHref = (
    target: number,
    next: { role: UserRole | null; active: ActiveFilter | null; sort: string | null },
  ) =>
    pageHref(ADMIN_USERS_ROUTE, target, {
      [SEARCH_PARAM]: q === '' ? null : q,
      [ROLE_PARAM]: next.role,
      [ACTIVE_PARAM]: next.active,
      [SORT_PARAM]: next.sort,
    });

  const current = { role, active, sort: sortInRequest };

  return {
    users: data ? [...data.content] : [],
    page,
    totalPages,
    sorting,
    role,
    active,
    /** Кто вошёл: свою учётку форма не даёт разжаловать, а строка помечена. */
    currentUserId: profile?.id ?? null,

    searchText: search.text,
    onSearchChange: search.setText,
    onSearchClear: search.clear,
    /** Сколько нашлось — только когда отбор задан и ответ пришёл. */
    foundCount: isFiltered && data !== undefined ? data.totalElements : null,

    isLoading: query.isLoading,
    isOffline: query.isPaused && data === undefined,
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /**
     * Пусто — либо «никого не нашлось», либо «учёток нет вовсе». Второе
     * на живом портале невозможно — смотрящий его админ сам учётка, —
     * но отбор, под который не попал никто, обычен.
     */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    isFiltered,
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) => listHref(target, current),
    /** Смена отбора сбрасывает страницу — как у новостей. */
    hrefForRole: (next: UserRole | null) => listHref(1, { ...current, role: next }),
    hrefForActive: (next: ActiveFilter | null) => listHref(1, { ...current, active: next }),
    /** Сбросить всё, кроме порядка: ссылка из пустой выдачи. */
    resetFiltersHref: pageHref(ADMIN_USERS_ROUTE, 1, { [SORT_PARAM]: sortInRequest }),

    onSortingChange: (next: SortingState) => {
      const value = sortParam(next);

      void navigate(listHref(1, { ...current, sort: value === DEFAULT_SORT ? null : value }));
    },

    editing,
    startCreate: () => setEditing({ user: null }),
    startEdit: (user: AdminUser) => setEditing({ user }),
    closeEditor: () => setEditing(null),

    resetting,
    startReset: (user: AdminUser) => setResetting(user),
    closeReset: () => setResetting(null),

    terminating,
    askTerminate: (user: AdminUser) => setTerminating(user),
    cancelTerminate: () => setTerminating(null),
    confirmTerminate: () => {
      if (terminating) terminate(terminating);
    },
    isTerminating,
  };
}

/**
 * Роль из адреса. Значение вне словаря — «без отбора»: контракт отвечает
 * на него `400`, и чужая ссылка с опечаткой ломала бы страницу.
 */
function parseRole(raw: string | null): UserRole | null {
  return ROLES.find((role) => role === raw) ?? null;
}

function parseActive(raw: string | null): ActiveFilter | null {
  return raw === 'true' || raw === 'false' ? raw : null;
}
