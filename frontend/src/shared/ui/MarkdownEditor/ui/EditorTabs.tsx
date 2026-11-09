import type { KeyboardEvent } from 'react';

import { cn } from '@shared/lib';

import { panelId, tabId, type EditorTab } from '../lib/tabIds';

interface EditorTabsProps {
  /** Идентификатор поля: от него считаются `id` вкладок и панелей. */
  fieldId: string;
  /** Подпись поля — входит в имя списка вкладок: полей на форме бывает несколько. */
  fieldLabel: string;
  tab: EditorTab;
  onSelect: (tab: EditorTab) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const TABS: readonly { value: EditorTab; label: string }[] = [
  { value: 'source', label: 'Текст' },
  { value: 'preview', label: 'Предпросмотр' },
];

/** Вкладки «Текст» и «Предпросмотр». Чистые: выбранная и клавиши приходят пропсами. */
export function EditorTabs({ fieldId, fieldLabel, tab, onSelect, onKeyDown }: EditorTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={`Вид: ${fieldLabel}`}
      onKeyDown={onKeyDown}
      className="flex gap-1"
    >
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="tab"
          id={tabId(fieldId, value)}
          data-tab={value}
          aria-selected={tab === value}
          aria-controls={panelId(fieldId, value)}
          tabIndex={tab === value ? 0 : -1}
          onClick={() => onSelect(value)}
          className={cn(
            'rounded px-3 py-1 text-sm font-bold transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
            tab === value
              ? 'bg-white text-text-heading shadow-sm'
              : 'text-text-muted hover:text-text-heading',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
