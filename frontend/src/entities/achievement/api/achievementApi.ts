import { api } from '@shared/api';
import type { Achievement, AchievementPage, PageParams } from '@shared/types';

/**
 * Публичное чтение достижений — три ручки из шести, что есть у модуля.
 *
 * Тонкий слой поверх axios: адрес, параметры, разворачивание `data`. Разбор
 * ошибок делает интерцептор (`shared/api/client.ts`), кэш и повторы —
 * TanStack Query; здесь нет ни того, ни другого намеренно — тем же правилом
 * живут `entities/news` и остальные сущности.
 *
 * Админские ручки (`/api/achievements`, `POST`, `PUT`, `DELETE`) сюда
 * не попали: их время — блок 4 бэклога (F-45), и лежать они будут в фиче
 * правки, а не здесь. Сущность знает только чтение.
 *
 * Параметры — общий `PageParams` без своего типа: фильтров у списков нет,
 * а «достижения одного преподавателя» — не фильтр, а отдельный адрес.
 */

const PUBLIC_ACHIEVEMENTS_PATH = '/api/public/achievements';
const PUBLIC_TEACHERS_PATH = '/api/public/teachers';

/**
 * Страница опубликованных достижений, новые сверху. Скрытых
 * (`display: false`) здесь не бывает вовсе — их отсекает бэкенд.
 *
 * `signal` приходит от TanStack Query и отменяет запрос, когда он перестал
 * быть нужен: без него быстрое перелистывание оставляло бы в полёте ответы,
 * которые уже некуда девать.
 */
export async function fetchAchievementPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<AchievementPage> {
  const { data } = await api.get<AchievementPage>(PUBLIC_ACHIEVEMENTS_PATH, { params, signal });
  return data;
}

/**
 * Одно достижение. Скрытое и несуществующее неразличимы — оба дают `404`,
 * иначе перебором `id` можно было бы пересчитать неопубликованные черновики
 * (docs/API.md, «Достижения кафедры»).
 */
export async function fetchAchievementItem(
  id: number,
  signal?: AbortSignal,
): Promise<Achievement> {
  const { data } = await api.get<Achievement>(`${PUBLIC_ACHIEVEMENTS_PATH}/${id}`, { signal });
  return data;
}

/**
 * Страница опубликованных достижений одного преподавателя.
 *
 * Неизвестный `teacherId` даёт не `404`, а **пустую страницу**: ручка
 * фильтрует достижения по ссылке, а не проверяет карточку (docs/API.md,
 * «Достижения кафедры»). Поэтому «преподавателя нет» и «достижений нет»
 * отсюда неразличимы, и решает это вызывающий: блок рисуется только
 * рядом с загруженной карточкой.
 */
export async function fetchTeacherAchievementPage(
  teacherId: number,
  params: PageParams,
  signal?: AbortSignal,
): Promise<AchievementPage> {
  const { data } = await api.get<AchievementPage>(
    `${PUBLIC_TEACHERS_PATH}/${teacherId}/achievements`,
    { params, signal },
  );
  return data;
}
