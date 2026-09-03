import { achievementHandlers } from './achievements';
import { conferenceHandlers } from './conferences';
import { editablePageHandlers } from './editablePages';
import { publicHelperHandlers } from './helpers';
import { newsHandlers } from './news';
import { publicTeacherHandlers, teacherHandlers } from './teachers';

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
 */
export const handlers = [
  ...newsHandlers(),
  ...conferenceHandlers(),
  ...achievementHandlers(),
  ...editablePageHandlers(),
  ...publicTeacherHandlers(),
  ...teacherHandlers(),
  ...publicHelperHandlers(),
];
