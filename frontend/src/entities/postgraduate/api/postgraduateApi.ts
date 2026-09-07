import { api } from '@shared/api';
import type { PageParams, PostgraduatePage } from '@shared/types';

/**
 * Чтение записей аспирантуры — одна публичная ручка списка. Сущность знает
 * только чтение, тем же правилом живут `entities/news`, `entities/teacher`
 * и `entities/helper`: модераторский CRUD приедет с блоком 4 и ляжет
 * в `features`.
 */
const PUBLIC_POSTGRADUATES_PATH = '/api/public/postgraduates';

/**
 * Страница записей аспирантуры: аспирант, тема, специальность, год
 * поступления и руководитель — всё, что показывает таблица.
 *
 * Незаданные поля `params` axios в строку запроса не кладёт, то есть `{}`
 * уходит как `GET /api/public/postgraduates` и получает умолчания
 * контракта: двадцать записей, порядок по фамилии и имени аспиранта.
 *
 * Сортировка своя не передаётся по той же причине, что у ППС и УВП:
 * алфавит по фамилии — то, что нужно списку людей, и он же стоит
 * на бэкенде по умолчанию.
 *
 * Фильтров `?teacherId=` и `?speciality=` здесь нет намеренно, хотя
 * контракт их принимает: страница аспирантуры показывает список целиком,
 * а первым их потребителем станет блок «аспиранты» на карточке ППС либо
 * форма правки из блока 4. Параметр без потребителя проверить нечем —
 * то же правило, по которому в `entities/helper` нет функции одной
 * карточки.
 */
export async function fetchPostgraduatesPage(
  params: PageParams,
  signal?: AbortSignal,
): Promise<PostgraduatePage> {
  const { data } = await api.get<PostgraduatePage>(PUBLIC_POSTGRADUATES_PATH, {
    params,
    signal,
  });

  return data;
}
