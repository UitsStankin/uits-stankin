import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { setupApi } from './app/providers/setupApi';
import './index.css';

// До первого рендера: 401 может прилететь на самом первом запросе,
// и к этому моменту api-клиент уже должен знать, куда уводить пользователя.
setupApi();

function render() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

/**
 * Моки включаются флагом, а не режимом сборки: обычная разработка
 * по-прежнему идёт против настоящего бэкенда. Подменять его молча нельзя —
 * «у меня работает» на выдуманных данных обходится дороже, чем отсутствие
 * моков вовсе.
 *
 * Рендер ждёт запуска воркера: страница, успевшая уйти в сеть до него,
 * получила бы ответ мимо моков — то есть ровно то состояние, ради которого
 * их и включали, не воспроизвелось бы.
 *
 * В прод-сборке `import.meta.env.DEV` статически ложно, и вместе с веткой
 * из бандла выпадает динамический импорт: msw лежит в devDependencies,
 * и на проде его нет вовсе.
 *
 * `onUnhandledRequest: 'bypass'`, в отличие от тестов: мимо воркера в браузере
 * идут картинки, шрифты и ручки, которых в хендлерах нет и быть не должно.
 */
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  void import('@shared/api/mocks/browser').then(async ({ worker }) => {
    await worker.start({ onUnhandledRequest: 'bypass' });
    render();
  });
} else {
  render();
}
