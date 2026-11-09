import { api } from '@shared/api';
import type { AdminUserListParams, AdminUserPage, Page, UserDirectoryEntry } from '@shared/types';

/**
 * Справочник учётных записей преподавателей — `GET /api/users/directory`.
 *
 * Сущность знает только чтение, как `entities/subject`: правка учёток
 * приедет с F-46 и ляжет в фичу. Пока это словарь, из которого форма
 * карточки ППС выбирает связь — ровно то же место, что дисциплины
 * занимают в той же форме.
 *
 * Ручка **не публичная**: открыта админу, модератору и преподавателю
 * (docs/API.md, «Эндпоинты»), поэтому и префикса `public` в пути нет.
 * Второй такой сущности у портала нет — у остальных читает публичная
 * ручка, а закрытую зовёт фича правки.
 */
const USER_DIRECTORY_PATH = '/api/users/directory';
const USERS_PATH = '/api/users';

/**
 * Размер страницы справочника у контракта — `50`, а не общие `20`,
 * и сотня сверху ограничена жёстко: больший `size` молча урезается
 * (docs/API.md, «Пагинация списков»).
 *
 * Просим сотню, потому что справочник — это выпадающий список, а не
 * страница: пролистать его в `<select>` нельзя, и учётка со второй
 * страницы просто не нашлась бы. Ста хватает с запасом — в справочник
 * попадают только действующие учётки с ролью `teacher`, а ППС кафедры
 * — это десятки. Перестанет хватать — форма увидит `totalElements`
 * больше сотни и это станет заметно, а не молча потеряется.
 */
const DIRECTORY_SIZE = 100;

/**
 * Страница справочника: `id` и ФИО действующих учёток преподавателей.
 *
 * Логина и почты в ответе нет — так задумано контрактом, разбор
 * в типе `UserDirectoryEntry`.
 */
export async function fetchUserDirectory(
  signal?: AbortSignal,
): Promise<Page<UserDirectoryEntry>> {
  const { data } = await api.get<Page<UserDirectoryEntry>>(USER_DIRECTORY_PATH, {
    params: { size: DIRECTORY_SIZE },
    signal,
  });

  return data;
}

/**
 * Список учётных записей целиком — `GET /api/users`, ручка админская.
 *
 * Чтение лежит в сущности, как у новостей админская выдача
 * (`fetchAllNewsPage`): сущность знает, как прочитать учётки, а создание,
 * правка и блокировка — действия админа и живут в фиче `manage-users`.
 *
 * Отборы (`q`, `active`, `role`) уходят как есть: имена параметров
 * в адресе страницы и в запросе совпадают. Неопределённые axios
 * в строку запроса не кладёт.
 */
export async function fetchUsers(
  params: AdminUserListParams,
  signal?: AbortSignal,
): Promise<AdminUserPage> {
  const { data } = await api.get<AdminUserPage>(USERS_PATH, { params, signal });

  return data;
}
