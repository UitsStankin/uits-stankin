/**
 * Моки контракта — общая точка входа для тестов и для dev-режима.
 *
 * `server.ts` (Node) и `browser.ts` (воркер) отсюда НЕ экспортируются
 * намеренно: они тянут разные окружения, и общий реэкспорт затащил бы
 * `msw/node` в браузерный бандл.
 */
export { handlers } from './handlers';
export { editablePageHandlers } from './editablePages';
export { makeNews, newsFixture, newsHandlers, newsPage } from './news';
export { problemResponse } from './problemResponse';
