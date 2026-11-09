import { api } from '@shared/api';
import type { EditablePage, EditablePageRequest, EditablePageSlug } from '@shared/types';

/**
 * Правка раздела — `PUT /api/pages/{slug}`. Единственная пишущая ручка
 * модуля: набор разделов закрыт, создать четырнадцатый или удалить
 * существующий через API нельзя (docs/API.md, «Редактируемые страницы»).
 *
 * Лежит в фиче, а не в сущности: сущность знает только чтение — та же
 * граница, что у новостей и карточек ППС.
 */
const PAGES_PATH = '/api/pages';

/**
 * Ответ — раздел после правки. Неизвестный слаг — `404`, а не новый
 * раздел; из типизированного кода его не отправить, поэтому `404` здесь
 * означает не доехавшую до стенда миграцию.
 */
export async function updateEditablePage(
  slug: EditablePageSlug,
  body: EditablePageRequest,
): Promise<EditablePage> {
  const { data } = await api.put<EditablePage>(`${PAGES_PATH}/${slug}`, body);

  return data;
}
