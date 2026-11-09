import { useState, type KeyboardEvent } from 'react';

import type { EditorTab } from '../lib/tabIds';

/**
 * Вкладки «Текст» и «Предпросмотр» — по правилам WAI-ARIA «Tabs»: стрелки
 * переключают и переносят фокус, в порядке табуляции стоит одна вкладка —
 * выбранная.
 *
 * Активация автоматическая, а не по Enter: показать предпросмотр ничего
 * не стоит, и лишнее нажатие ради него было бы только лишним.
 *
 * Роль `tablist` без стрелок была бы хуже, чем никакой: она обещает диктору
 * именно такое поведение — то же рассуждение, что у панели форматирования
 * (`useToolbarRoving`).
 */
export function useEditorTabs() {
  const [tab, setTab] = useState<EditorTab>('source');

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextTab(event.key, tab);

    if (next === null) return;

    event.preventDefault();
    setTab(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
  }

  return { tab, select: setTab, onKeyDown };
}

/** Куда ведёт клавиша. Вкладок две, поэтому любая стрелка — на соседнюю. */
function nextTab(key: string, current: EditorTab): EditorTab | null {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowRight':
      return current === 'source' ? 'preview' : 'source';
    case 'Home':
      return 'source';
    case 'End':
      return 'preview';
    default:
      return null;
  }
}
