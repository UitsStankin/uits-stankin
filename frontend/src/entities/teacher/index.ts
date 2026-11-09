/**
 * Публичный вход в сущность: снаружи берут отсюда, а не из api/lib/ui
 * напрямую.
 *
 * Сущность знает только чтение — публичный список, одну карточку и свою.
 * Вся запись, и своя и модераторская, лежит в фиче
 * `features/manage-teachers`: `entities` описывает предметную область,
 * действия пользователя — дело `features`.
 *
 * Списочная ручка публичная, и раздел админки (F-44) читает её же —
 * модераторского списка в контракте нет вовсе. Скрытых карточек у ППС
 * не бывает, поэтому и делить чтение надвое, как у новостей, не пришлось.
 *
 * `teacherKeys` наружу выходит, в отличие от `newsKeys`: форма правки
 * своей карточки кладёт ответ `PUT` прямо на ключ `me()`, не гоняя
 * повторный `GET`, а обе формы админки сбрасывают ветку целиком.
 */
export {
  fetchMyTeacherCard,
  fetchTeacher,
  fetchTeachersPage,
  TEACHERS_ME_PATH,
} from './api/teacherApi';
export {
  myTeacherCardQuery,
  teacherKeys,
  teacherQuery,
  teachersListQuery,
} from './api/teacherQueries';
export { formatYears, teacherCredentials, teacherFullName } from './lib/teacherPresenters';
export { TeacherCard } from './ui/TeacherCard';
export { TeacherCardSkeleton } from './ui/TeacherCardSkeleton';
