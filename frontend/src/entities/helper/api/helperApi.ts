import { api } from '@shared/api';
import type { HelperPage, PageParams } from '@shared/types';

/**
 * Чтение карточек УВП — одна публичная ручка списка. Сущность знает
 * только чтение, тем же правилом живут `entities/news` и
 * `entities/teacher`: модераторский CRUD приедет с блоком 4 и ляжет
 * в `features`.
 *
 * Функции одной карточки нет намеренно: `GET /api/public/helpers/{id}`
 * отдаёт то же тело, что элемент списка, и нужна форме правки — «без неё
 * карточку приходилось искать в списке постранично» (docs/API.md, «УВП»).
 * Посетителю показывать по `id` нечего, и заведётся эта функция вместе
 * с формой, которая её позовёт.
 */
const PUBLIC_HELPERS_PATH = '/api/public/helpers';

/**
 * Страница карточек УВП: ФИО, должность и фото — карточка целиком.
 *
 * Незаданные поля `params` axios в строку запроса не кладёт, то есть `{}`
 * уходит как `GET /api/public/helpers` и получает умолчания контракта:
 * двадцать карточек, порядок по фамилии и имени.
 *
 * Сортировка своя не передаётся по той же причине, что у ППС: алфавит
 * по фамилии — то, что нужно списку сотрудников, и он же стоит
 * на бэкенде по умолчанию.
 */
export async function fetchHelpersPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<HelperPage> {
  const { data } = await api.get<HelperPage>(PUBLIC_HELPERS_PATH, { params, signal });
  return data;
}
