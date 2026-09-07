/**
 * Публичный вход в сущность: снаружи берут отсюда, а не из `api`
 * напрямую.
 *
 * Сущность знает только чтение списка. Создание, правка и удаление —
 * действия пользователя, и лежат они в `features/manage-subjects`,
 * как правка карточки ППС в `features/edit-teacher-card`.
 *
 * Своего `ui` у сущности нет: дисциплина показывается строкой таблицы
 * админки вместе с её колонками — то же решение, что у записи
 * аспирантуры (`entities/postgraduate`).
 */
export { fetchSubjectsPage } from './api/subjectApi';
export { subjectKeys, subjectsListQuery } from './api/subjectQueries';
