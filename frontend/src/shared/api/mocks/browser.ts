import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/**
 * Перехватчик запросов для браузера. Включается флагом `VITE_ENABLE_MOCKS`
 * в `main.tsx`, сам по себе не запускается.
 *
 * Нужен ровно для того, чего на живом бэкенде не воспроизвести: пустых
 * списков, пятисоток, медленных ответов, протухшего токена. Отклонения
 * заводятся в консоли поверх общего набора:
 *
 *   worker.use(http.get('*\/api/public/news', () => new Response(null, { status: 500 })))
 *
 * Воркер `public/mockServiceWorker.js` создан командой `msw init` и правится
 * только ею.
 */
export const worker = setupWorker(...handlers);
