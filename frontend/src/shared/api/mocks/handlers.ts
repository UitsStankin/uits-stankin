import { achievementHandlers } from './achievements';
import { conferenceHandlers } from './conferences';
import { editablePageHandlers } from './editablePages';
import { helperHandlers } from './helpers';
import { newsHandlers } from './news';
import { postgraduateHandlers } from './postgraduates';
import { subjectHandlers } from './subjects';
import { myTeacherCardHandlers, teacherHandlers } from './teachers';
import { adminUserHandlers, userDirectoryHandlers } from './users';

/**
 * Хендлеры по умолчанию — «всё хорошо, данные есть».
 *
 * Общий набор один на тесты и на браузер: мок, разошедшийся между двумя
 * применениями, перестаёт быть заменой бэкенда и становится двумя разными
 * выдумками. Отклонения от него — пустой список, `500`, задержка —
 * заводятся точечно там, где проверяются: `server.use(...)` в тесте,
 * `worker.use(...)` в консоли браузера.
 *
 * Редактируемые разделы отдают пустой текст, потому что таковы они
 * на чистой базе. Заполненный блок главной в браузере — это
 * `worker.use(...editablePageHandlers({ 'home-before': '# Заголовок' }))`.
 *
 * Закрытые ручки в наборе есть, и стоят они тут ради браузера: под
 * `VITE_ENABLE_MOCKS` разделы админки должны открываться и работать
 * целиком, а не упираться в необработанный запрос. Это словарь дисциплин,
 * с F-43 — правка новостей, с F-44 — правка карточек ППС и УВП
 * и справочник учёток, а с F-45 — правка конференций, достижений
 * и редактируемых разделов, с F-46 — учётные записи, с F-47 — записи
 * аспирантуры. Правка приезжает
 * тем же набором, что и публичное чтение: список у них общий, и созданная модератором запись обязана
 * появиться на публичной странице. Публичным страницам закрытые ручки
 * не мешают: никто из них туда не ходит. Профиль в набор по-прежнему
 * не входит: он означал бы вошедшего пользователя в каждом тесте
 * страницы.
 */
export const handlers = [
  ...newsHandlers(),
  ...conferenceHandlers(),
  ...achievementHandlers(),
  ...editablePageHandlers(),
  ...teacherHandlers(),
  ...myTeacherCardHandlers(),
  ...helperHandlers(),
  ...userDirectoryHandlers(),
  ...adminUserHandlers(),
  ...postgraduateHandlers(),
  ...subjectHandlers(),
];
