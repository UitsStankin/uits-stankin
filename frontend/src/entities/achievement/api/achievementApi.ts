import { api } from '@shared/api';
import type { Achievement, AchievementPage, PageParams } from '@shared/types';

/**
 * Чтение достижений — публичное и модераторское, четыре ручки из восьми,
 * что есть у модуля.
 *
 * Тонкий слой поверх axios: адрес, параметры, разворачивание `data`. Разбор
 * ошибок делает интерцептор (`shared/api/client.ts`), кэш и повторы —
 * TanStack Query; здесь нет ни того, ни другого намеренно — тем же правилом
 * живут `entities/news` и остальные сущности.
 *
 * **Сущность знает только чтение** — и публичное, и модераторское.
 * `GET /api/achievements` лежит здесь, а не в фиче админки, по той же
 * границе, что у новостей и конференций: закрытость ручки — это про права,
 * а не про то, что она делает. Создание, правка и удаление ушли в фичу
 * (`features/manage-achievements`).
 *
 * `GET /api/achievements/{id}` не заведён вовсе: форма берёт достижение
 * из строки таблицы, потому что списочная и детальная ручки отдают один DTO.
 *
 * Параметры — общий `PageParams` без своего типа: фильтров у списков нет,
 * а «достижения одного преподавателя» — не фильтр, а отдельный адрес.
 */

const PUBLIC_ACHIEVEMENTS_PATH = '/api/public/achievements';
const PUBLIC_TEACHERS_PATH = '/api/public/teachers';

/** Модераторская половина модуля: то же чтение, но со скрытыми достижениями. */
const ACHIEVEMENTS_PATH = '/api/achievements';

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

/**
 * Страница **всех** достижений, включая скрытые, — `GET /api/achievements`.
 *
 * Отдельная ручка, а не параметр публичной: посетителю черновиков не видно
 * вовсе. Ответ — тот же DTO, поэтому и тип тот же; отличается только
 * выборка и то, что `display` в ней бывает `false`.
 */
export async function fetchAllAchievementPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<AchievementPage> {
  const { data } = await api.get<AchievementPage>(ACHIEVEMENTS_PATH, { params, signal });
  return data;
}
