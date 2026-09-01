/**
 * Публичный вход в сущность: снаружи берут отсюда, а не из api/lib/ui
 * напрямую.
 *
 * Сущность знает только чтение — публичный список, одну карточку и свою.
 * Правка своей карточки — фича `features/edit-teacher-card`; админский
 * CRUD приедет с блоком 4 и ляжет туда же, а не сюда: `entities` описывает
 * предметную область, действия пользователя — дело `features`.
 *
 * `teacherKeys` наружу выходит, в отличие от `newsKeys`: форма правки
 * своей карточки кладёт ответ `PUT` прямо на ключ `me()`, не гоняя
 * повторный `GET`.
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
export { teacherCredentials, teacherFullName } from './lib/teacherPresenters';
export { TeacherCard } from './ui/TeacherCard';
export { TeacherCardSkeleton } from './ui/TeacherCardSkeleton';
