import { api } from '@shared/api';
import type { PostgraduateDetails, PostgraduateListParams, PostgraduatePage } from '@shared/types';

/**
 * Чтение записей аспирантуры: публичный список и одна запись для формы
 * правки. Сущность знает только чтение, тем же правилом живут
 * `entities/news`, `entities/teacher` и `entities/helper`: запись —
 * в `features/manage-postgraduates`.
 */
const PUBLIC_POSTGRADUATES_PATH = '/api/public/postgraduates';

/**
 * Модераторская ручка одной записи. Публичного двойника у неё нет:
 * заведена ровно для формы правки (T-56a), потому что в элементе списка
 * ФИО склеено, а группы нет вовсе.
 */
const POSTGRADUATES_PATH = '/api/postgraduates';

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
 * Поиск уходит параметром `q` — с T-78 по заявке B-3. Он серверный
 * и другим быть не мог: клиент видит двадцать записей из скольких-то,
 * и фильтровать ему нечего.
 *
 * Фильтров `?teacherId=` и `?speciality=` здесь нет намеренно, хотя
 * контракт их принимает: страница аспирантуры показывает список целиком,
 * а первым их потребителем станет блок «аспиранты» на карточке ППС либо
 * форма правки из блока 4. Параметр без потребителя проверить нечем —
 * то же правило, по которому в `entities/helper` нет функции одной
 * карточки.
 */
export async function fetchPostgraduatesPage(
  params: PostgraduateListParams,
  signal?: AbortSignal,
): Promise<PostgraduatePage> {
  const { data } = await api.get<PostgraduatePage>(PUBLIC_POSTGRADUATES_PATH, {
    params,
    signal,
  });

  return data;
}

/**
 * Одна запись в составе полей формы — `GET /api/postgraduates/{id}`.
 * Открыта модератору и админу, несуществующая запись — `404`.
 *
 * Лежит в сущности, хотя ручка закрытая: это чтение, а не действие,
 * как и закрытый список учёток в `entities/user`.
 */
export async function fetchPostgraduate(
  id: number,
  signal?: AbortSignal,
): Promise<PostgraduateDetails> {
  const { data } = await api.get<PostgraduateDetails>(`${POSTGRADUATES_PATH}/${id}`, { signal });

  return data;
}
