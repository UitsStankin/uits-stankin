import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from '@shared/api/mocks/server';

/**
 * Общая обвязка всех тестов: матчеры jest-dom и перехватчик запросов.
 *
 * `onUnhandledRequest: 'error'` — не строгость ради строгости. Без него
 * запрос, для которого хендлера нет, уходит в настоящую сеть: на машине
 * с поднятым бэкендом тест позеленел бы на реальных данных, а в CI упал бы
 * по таймауту через пятнадцать секунд, и падение выглядело бы как «тест
 * флакует», а не «мок забыли».
 *
 * `cleanup` вызывается руками, потому что `globals` выключены: автоматическую
 * уборку Testing Library вешает только на глобальные хуки.
 */
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  // Точечные хендлеры теста (`server.use`) не должны доживать до соседнего.
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
