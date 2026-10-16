import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Перехватчик запросов для тестов (Node). Жизненный цикл — в `src/test/setup.ts`:
 * поднимается один раз на файл, между тестами сбрасывает точечные хендлеры.
 *
 * Отдельный файл от `browser.ts` не ради красоты: `msw/node` тянет за собой
 * Node-модули, и один общий вход утащил бы их в браузерный бандл.
 */
export const server = setupServer(...handlers);
