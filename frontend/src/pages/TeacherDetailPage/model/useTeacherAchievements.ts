import { useQuery } from '@tanstack/react-query';

import { teacherAchievementsQuery } from '@entities/achievement';
import { achievementRoute } from '@shared/config/routes';
import type { Achievement } from '@shared/types';

/** Что блоку достижений нужно знать о своём запросе. */
export type TeacherAchievementsState = {
  achievements: readonly Achievement[];
  /**
   * Сколько достижений у преподавателя всего. Больше длины списка бывает:
   * ручка постраничная, и блок берёт только первую страницу.
   */
  total: number;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  hrefForAchievement: (id: number) => string;
};

/**
 * Достижения одного преподавателя — ручка
 * `GET /api/public/teachers/{teacherId}/achievements`, появившаяся с T-29.
 *
 * Живёт при карточке ППС, а не отдельной страницей: так записано в F-25,
 * и по делу — достижения преподавателя это раздел его карточки (в оригинале
 * они были одной из пяти её вкладок), а своего адреса у них нет. Открывается
 * достижение отсюда в общем разделе, `/scientific-activities/achievements/{id}`.
 *
 * Запрос уходит **параллельно** с запросом самой карточки, а не после него:
 * связать их значило бы выстроить водопад и добавить посетителю целый круг
 * ожидания ради экономии одного запроса в редком случае несуществующего
 * `id`. Ошибку такого случая гасит не хук, а сборка: блок рисуется только
 * рядом с загруженной карточкой — на несуществующем преподавателе эта ручка
 * по контракту отвечает не `404`, а **пустой страницей**, и «достижений нет»
 * висело бы под надписью «преподаватель не найден».
 *
 * Скелета у блока нет намеренно, в отличие от списочных страниц. Достижений
 * у большинства карточек не будет вовсе, и силуэт, мигнувший под профилем
 * и исчезнувший, — это дёрганье страницы на пустом месте. Пока показывать
 * нечего, блока нет; он появляется вместе с содержимым.
 *
 * Размер страницы не задаётся: контрактные двадцать записей на карточку
 * человека — это с запасом, а `size=100` тащил бы сотню `content` целиком
 * ради случая, которого не бывает. Если достижений всё же больше, блок
 * говорит об этом словами, а не молчит (`ui/TeacherAchievements.tsx`).
 */
export function useTeacherAchievements(teacherId: number | null): TeacherAchievementsState {
  const query = useQuery({
    ...teacherAchievementsQuery(teacherId ?? 0),
    // Битый `id` в адресе в запрос не уходит: ключ всё равно нужен —
    // хуки не бывают условными, поэтому `0`, по которому запрос не пойдёт.
    enabled: teacherId !== null,
  });

  return {
    achievements: query.data?.content ?? [],
    total: query.data?.totalElements ?? 0,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
    hrefForAchievement: achievementRoute,
  };
}
