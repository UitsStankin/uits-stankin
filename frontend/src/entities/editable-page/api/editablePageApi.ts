import { api } from '@shared/api';
import type {
  EditablePage,
  EditablePageSlug,
  EditablePagesPage,
  PageParams,
} from '@shared/types';

/**
 * Чтение редактируемых разделов — публичное и модераторское. Сущность
 * знает только чтение — тем же правилом живут `entities/news`
 * и `entities/teacher`: правка раздела лежит в фиче
 * (`features/manage-editable-pages`).
 *
 * Слайс называется `editable-page`, а не `page`: рядом стоит слой FSD
 * `pages/`, и `entities/page` в импортах читалось бы как страница портала,
 * а не как редактируемый блок текста.
 */

const PUBLIC_PAGES_PATH = '/api/public/pages';

/** Модераторский список всех тринадцати разделов. */
const PAGES_PATH = '/api/pages';

/**
 * Раздел по слагу. Неизвестный слаг — `404`, но получить его из типизированного
 * кода нельзя: набор слагов закрыт и выражен union'ом (`EditablePageSlug`).
 * То есть `404` здесь означает не опечатку, а не доехавшую до стенда миграцию.
 *
 * Форма правки в админке читает раздел этой же ручкой: скрытых разделов
 * не бывает, модераторской ручки одного раздела в контракте нет, а DTO тот же.
 */
export async function fetchEditablePage(
  slug: EditablePageSlug,
  signal?: AbortSignal,
): Promise<EditablePage> {
  const { data } = await api.get<EditablePage>(`${PUBLIC_PAGES_PATH}/${slug}`, { signal });
  return data;
}

/**
 * Страница списка разделов — `GET /api/pages`, по `id`. Разделов тринадцать,
 * и на одну страницу по двадцать они помещаются целиком; ответ всё равно
 * страница, потому что так устроены все списки контракта.
 */
export async function fetchEditablePagesPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<EditablePagesPage> {
  const { data } = await api.get<EditablePagesPage>(PAGES_PATH, { params, signal });
  return data;
}
