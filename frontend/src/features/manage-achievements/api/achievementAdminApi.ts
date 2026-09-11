import { api } from '@shared/api';
import type { Achievement, AchievementRequest } from '@shared/types';

/**
 * Создание, правка и удаление достижения — `POST`, `PUT`
 * и `DELETE /api/achievements`.
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у новостей и конференций. Путь повторён строкой, а не
 * импортирован из сущности, по той же причине, что у них.
 */
const ACHIEVEMENTS_PATH = '/api/achievements';

/** Ответ — созданное достижение с присвоенным `id` и собранным `teacherName` (`201`). */
export async function createAchievement(body: AchievementRequest): Promise<Achievement> {
  const { data } = await api.post<Achievement>(ACHIEVEMENTS_PATH, body);

  return data;
}

/**
 * Правка — **полная замена** (docs/API.md, «Достижения кафедры»): поле,
 * не пришедшее в теле, обнуляется. У достижения это особенно заметно —
 * пустой `previewImage` не снимает обложку, а даёт `400`, потому что
 * обложка обязательна, а пропущенный `teacherId` молча делает достижение
 * кафедральным.
 */
export async function updateAchievement(id: number, body: AchievementRequest): Promise<Achievement> {
  const { data } = await api.put<Achievement>(`${ACHIEVEMENTS_PATH}/${id}`, body);

  return data;
}

/**
 * Удаление. `204` без тела, достижение пропадает физически вместе
 * с обложкой — отмены в контракте нет. Несуществующее даёт `404`.
 */
export async function deleteAchievement(id: number): Promise<void> {
  await api.delete(`${ACHIEVEMENTS_PATH}/${id}`);
}
