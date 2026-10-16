import { api } from '@shared/api';
import type { EditablePage, EditablePageSlug } from '@shared/types';

/**
 * Чтение редактируемых разделов. Сущность знает только чтение — тем же
 * правилом живут `entities/news` и `entities/teacher`: правка раздела
 * приедет админкой (F-45, блок 4) и ляжет в фичу, а не сюда.
 *
 * Слайс называется `editable-page`, а не `page`: рядом стоит слой FSD
 * `pages/`, и `entities/page` в импортах читалось бы как страница портала,
 * а не как редактируемый блок текста.
 */

const PUBLIC_PAGES_PATH = '/api/public/pages';

/**
 * Раздел по слагу. Неизвестный слаг — `404`, но получить его из типизированного
 * кода нельзя: набор слагов закрыт и выражен union'ом (`EditablePageSlug`).
 * То есть `404` здесь означает не опечатку, а не доехавшую до стенда миграцию.
 */
export async function fetchEditablePage(
  slug: EditablePageSlug,
  signal?: AbortSignal,
): Promise<EditablePage> {
  const { data } = await api.get<EditablePage>(`${PUBLIC_PAGES_PATH}/${slug}`, { signal });
  return data;
}
