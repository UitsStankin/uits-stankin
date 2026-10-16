import { useState, type FocusEvent, type KeyboardEvent } from 'react';

/**
 * Панель форматирования проходится стрелками, а не табом.
 *
 * Так устроены все панели инструментов: в порядок табуляции попадает
 * одна кнопка, между кнопками ходят стрелками (WAI-ARIA, «Toolbar»).
 * Без этого тринадцать кнопок стояли бы тринадцатью остановками между
 * предыдущим полем формы и текстом, который человек пришёл править,
 * — и клавиатурный путь до поля стал бы длиннее, чем весь остальной
 * путь по форме.
 *
 * Роль `toolbar` без стрелок была бы хуже, чем никакой: она обещает
 * диктору именно такое поведение.
 *
 * Активная кнопка помнится между заходами: вернувшись в панель табом,
 * человек попадает туда, откуда ушёл, а не в начало.
 */
export function useToolbarRoving(count: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextIndex(event.key, activeIndex, count);

    if (next === null) return;

    // Иначе стрелки заодно прокручивают страницу, а Home и End уносят
    // её в начало и в конец.
    event.preventDefault();
    setActiveIndex(next);
    buttonsOf(event.currentTarget)[next]?.focus();
  }

  /**
   * Клик мышью по кнопке тоже переносит «активную»: иначе следующая
   * стрелка увела бы курсор от нажатой кнопки к запомненной, а таб
   * вернулся бы не туда, откуда ушли.
   */
  function onFocus(event: FocusEvent<HTMLDivElement>) {
    // `event.target` React типизирует элементом, на котором висит
    // обработчик, хотя фокус пришёл на кнопку внутри него, — отсюда
    // приведение к `Element`.
    const focused = event.target as Element;
    const index = buttonsOf(event.currentTarget).findIndex((button) => button === focused);

    if (index !== -1) setActiveIndex(index);
  }

  return { activeIndex, onKeyDown, onFocus };
}

/** Куда ведёт клавиша. `null` — клавиша не наша, панель её не трогает. */
function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    // По кругу: на последней кнопке «вправо» возвращает на первую —
    // в панели инструментов это ожидаемое поведение, в отличие от списка.
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

function buttonsOf(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll('button')];
}
