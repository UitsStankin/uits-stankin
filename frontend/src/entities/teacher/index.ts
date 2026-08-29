/**
 * Публичный вход в сущность: снаружи берут отсюда, а не из api/lib напрямую.
 *
 * Сущность знает только чтение. Правка своей карточки — фича
 * `features/edit-teacher-card`; публичные список и детальная — F-21.
 */
export { fetchMyTeacherCard, TEACHERS_ME_PATH } from './api/teacherApi';
export { teacherKeys, myTeacherCardQuery } from './api/teacherQueries';
export { teacherFullName } from './lib/teacherPresenters';
