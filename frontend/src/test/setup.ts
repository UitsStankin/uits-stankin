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
/**
 * `matchMedia` в jsdom не реализован вовсе, а каркас портала выбирает
 * раскладку именно им (`widgets/Navbar/model/useIsDesktop.ts`): без
 * заглушки любой тест, рисующий шапку с меню, падает на первом рендере.
 *
 * Ответ считается по ширине окна, а не прибит константой: тест, который
 * поставит `window.innerWidth`, получит согласованный с ней ответ,
 * а не вечный «десктоп». Разбирается только `(min-width: Npx)` — другого
 * вида запросов в портале нет, и поддержка «на всякий случай» означала бы
 * код, который никто не выполнит.
 */
// `scrollTo` jsdom тоже не умеет и на каждый вызов пишет «Not implemented»
// в вывод теста. Прокрутку окна портал делает при смене адреса, то есть
// в тестах роутера это сообщение шло бы пачками и топило собой настоящие.
window.scrollTo = () => {};

window.matchMedia ??= (query: string): MediaQueryList => {
  const minWidth = Number(query.match(/min-width:\s*(\d+)px/)?.[1] ?? 0);

  return {
    media: query,
    matches: window.innerWidth >= minWidth,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
};

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

/**
 * У jsdom нет раскладки, и `Range` не умеет отдавать свои прямоугольники.
 *
 * Нужно это ProseMirror: после вставки он подводит курсор к месту правки
 * (`scrollIntoView` → `coordsAtPos`), а тот измеряет позицию через
 * `document.createRange()`. В jsdom метода нет вовсе, и вызов падает
 * `target.getClientRects is not a function` — уже после того, как тест
 * закончился, потому что фокус у TipTap отложен кадром анимации. Тест
 * при этом зеленеет, а Vitest пишет «unhandled error» и предупреждает
 * о ложном результате.
 *
 * Заглушка отдаёт пустой список и нулевой прямоугольник: измерять
 * в jsdom всё равно нечего, а ProseMirror такой ответ переживает —
 * он просто не находит, куда прокручивать. Ставится только если метода
 * нет: появится в jsdom настоящий — заглушка уйдёт сама.
 *
 * Стоит здесь, а не в тесте редактора: с F-43 редактор монтируется
 * и в формах админки, и ловушка досталась бы каждому такому файлу.
 */
const ZERO_RECT = {
  x: 0,
  y: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: 0,
  height: 0,
  toJSON: () => ({}),
} as DOMRect;

const NO_RECTS = Object.assign([], { item: () => null }) as unknown as DOMRectList;

// `Partial`, потому что в типах браузера метод есть всегда: без этого
// проверка сузила бы прототип до `never`, и присваивание не собралось бы.
const range = Range.prototype as Partial<Range>;

if (typeof range.getClientRects !== 'function') {
  range.getClientRects = () => NO_RECTS;
  range.getBoundingClientRect = () => ZERO_RECT;
}
