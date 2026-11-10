/**
 * Публичный вход в сущность: снаружи берут отсюда, а не из api/lib/ui
 * напрямую.
 *
 * Сущность знает только чтение — публичный список, одну карточку и свою.
 * Вся запись, и своя и модераторская, лежит в фиче
 * `features/manage-teachers`: `entities` описывает предметную область,
 * действия пользователя — дело `features`.
 *
 * Списков два, как у новостей: публичный — без архивных карточек,
 * защищённый (`adminTeachersListQuery`, с T-102) — со всеми; его читают
 * раздел админки и выбор преподавателя в формах (F-53).
 *
 * `teacherKeys` наружу выходит, в отличие от `newsKeys`: форма правки
 * своей карточки кладёт ответ `PUT` прямо на ключ `me()`, не гоняя
 * повторный `GET`, а обе формы админки сбрасывают ветку целиком.
 */
export {
  fetchAdminTeachersPage,
  fetchMyTeacherCard,
  fetchTeacher,
  fetchTeachersPage,
  TEACHERS_ME_PATH,
} from './api/teacherApi';
export {
  adminTeachersListQuery,
  myTeacherCardQuery,
  teacherKeys,
  teacherQuery,
  teachersListQuery,
} from './api/teacherQueries';
export { formatYears, teacherCredentials, teacherFullName } from './lib/teacherPresenters';
export { TeacherCard } from './ui/TeacherCard';
export { TeacherCardSkeleton } from './ui/TeacherCardSkeleton';
export { TeacherSelect } from './ui/TeacherSelect';
