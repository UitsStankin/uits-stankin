/**
 * Публичный вход в фичу: снаружи берут отсюда, а не из model/ui напрямую.
 *
 * Фича отдельная от сущности `teacher` по правилу «сущность знает только
 * чтение»: здесь — правка своей карточки из личного кабинета (F-16).
 * Публичные страницы ППС (F-21) читают сущность и о фиче не знают.
 */
export { useTeacherCardForm } from './model/useTeacherCardForm';
export { TeacherCardForm } from './ui/TeacherCardForm';
