import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import type { PageParams } from '@shared/types';

import {
  fetchAchievementItem,
  fetchAchievementPage,
  fetchTeacherAchievementPage,
} from './achievementApi';

/**
 * Ключи кэша достижений — та же иерархия, что у новостей
 * (`entities/news/api/newsQueries.ts`), с одним отличием: списков
 * у достижений **два вида** — раздел целиком и достижения одного
 * преподавателя.
 *
 * Оба вида лежат под общим префиксом `lists()`, а не рядом на разных
 * ветках. Это нужно `findCachedAchievement`: он ищет запись по всем
 * загруженным страницам, и переход с карточки ППС обязан обходиться
 * без запроса ровно так же, как переход из раздела. Разведи их
 * по разным префиксам — поиск пришлось бы вести по двум, и вторая ветка
 * рано или поздно из него выпала бы.
 */
export const achievementKeys = {
  all: ['achievements'] as const,
  lists: () => [...achievementKeys.all, 'list'] as const,
  list: (params: PageParams) => [...achievementKeys.lists(), 'all', params] as const,
  teacherList: (teacherId: number, params: PageParams) =>
    [...achievementKeys.lists(), 'teacher', teacherId, params] as const,
  items: () => [...achievementKeys.all, 'item'] as const,
  item: (id: number) => [...achievementKeys.items(), id] as const,
};

/**
 * Описание запроса страницы достижений раздела.
 *
 * `keepPreviousData` — единственная настройка, которой список отличается
 * от умолчаний `app/providers/queryClient.ts`: без него переход на вторую
 * страницу гасит первую, список схлопывается в скелет и уезжает скролл.
 * Разбор — у `newsListQuery`.
 */
export const achievementListQuery = (params: PageParams) =>
  queryOptions({
    queryKey: achievementKeys.list(params),
    queryFn: ({ signal }) => fetchAchievementPage(params, signal),
    placeholderData: keepPreviousData,
  });

/** Описание запроса одного достижения. */
export const achievementItemQuery = (id: number) =>
  queryOptions({
    queryKey: achievementKeys.item(id),
    queryFn: ({ signal }) => fetchAchievementItem(id, signal),
  });

/**
 * Описание запроса достижений одного преподавателя.
 *
 * `keepPreviousData` здесь нет: блок на карточке ППС не листается —
 * страница у него одна, и подменять её нечем.
 */
export const teacherAchievementsQuery = (teacherId: number, params: PageParams = {}) =>
  queryOptions({
    queryKey: achievementKeys.teacherList(teacherId, params),
    queryFn: ({ signal }) => fetchTeacherAchievementPage(teacherId, params, signal),
  });
