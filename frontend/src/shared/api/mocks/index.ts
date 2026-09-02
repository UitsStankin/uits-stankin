/**
 * Моки контракта — общая точка входа для тестов и для dev-режима.
 *
 * `server.ts` (Node) и `browser.ts` (воркер) отсюда НЕ экспортируются
 * намеренно: они тянут разные окружения, и общий реэкспорт затащил бы
 * `msw/node` в браузерный бандл.
 */
export { handlers } from './handlers';
export { conferenceHandlers, conferencesFixture, makeConference } from './conferences';
export { editablePageHandlers } from './editablePages';
export { helpersFixture, makeHelper, publicHelperHandlers } from './helpers';
export { makeNews, newsFixture, newsHandlers } from './news';
export { pageResponse } from './page';
export {
  makeTeacher,
  publicTeacherHandlers,
  teacherHandlers,
  teacherListItem,
  teachersFixture,
} from './teachers';
export { problemResponse } from './problemResponse';
