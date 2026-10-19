import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import { filterSlashItems, type SlashItem } from '../lib/slashItems';

export interface SlashMenuOptions {
  /** Открыть выбор фото; `null` — фото в этом поле нет, и пункта в меню тоже. */
  onPickPhotos: (() => void) | null;
}

interface Trigger {
  from: number;
  to: number;
  query: string;
}

const TRIGGER = /^\/([^\s/]{0,24})$/;

function triggerOf(state: EditorState): Trigger | null {
  const { selection } = state;
  if (!selection.empty) return null;

  const { $from } = selection;
  if ($from.parent.type.name !== 'paragraph') return null;

  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
  const match = TRIGGER.exec(before);
  if (!match) return null;

  return { from: $from.start(), to: $from.pos, query: match[1] ?? '' };
}

/**
 * Меню блоков по «/»: в начале пустой строки набирают слэш — рядом
 * с курсором появляется список, стрелки выбирают, Enter вставляет,
 * Escape закрывает. Набранное дальше сужает список: «/фо» оставит фото.
 *
 * Меню рисуется руками, в `body`, а не React'ом: оно живёт и умирает
 * вместе с состоянием редактора, и держать его в дереве компонентов
 * значило бы гонять каждое нажатие клавиши туда и обратно.
 */
export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return { onPickPhotos: null };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;

    let index = 0;
    let lastQuery: string | null = null;
    let dismissed: Trigger | null = null;
    let menu: HTMLDivElement | null = null;

    function current(state: EditorState): { trigger: Trigger; list: SlashItem[] } | null {
      const trigger = triggerOf(state);
      if (!trigger) return null;

      if (dismissed && dismissed.from === trigger.from && dismissed.query === trigger.query) {
        return null;
      }

      const list = filterSlashItems(trigger.query, { photos: options.onPickPhotos !== null });

      return list.length > 0 ? { trigger, list } : null;
    }

    function hide(view: EditorView) {
      if (menu) menu.hidden = true;
      view.dom.removeAttribute('aria-activedescendant');
    }

    function run(trigger: Trigger, item: SlashItem) {
      editor.chain().focus().deleteRange({ from: trigger.from, to: trigger.to }).run();

      switch (item.id) {
        case 'heading2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'heading3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bulletList':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'orderedList':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'blockquote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'photo':
          options.onPickPhotos?.();
          break;
      }
    }

    function render(view: EditorView) {
      const state = current(view.state);

      if (!state) {
        hide(view);
        return;
      }

      if (lastQuery !== state.trigger.query) {
        index = 0;
        lastQuery = state.trigger.query;
      }

      index = Math.min(index, state.list.length - 1);

      if (!menu) {
        menu = document.createElement('div');
        menu.className = 'u-slash';
        menu.setAttribute('role', 'listbox');
        menu.setAttribute('aria-label', 'Вставить блок');
        document.body.append(menu);
      }

      menu.hidden = false;
      menu.replaceChildren(
        ...state.list.map((item, position) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.id = `slash-option-${item.id}`;
          option.className = 'u-slash-item';
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', String(position === index));
          option.tabIndex = -1;

          const title = document.createElement('strong');
          title.textContent = item.title;
          const hint = document.createElement('small');
          hint.textContent = item.hint;
          option.append(title, hint);

          option.addEventListener('mousedown', (event) => {
            event.preventDefault();
            run(state.trigger, item);
          });

          return option;
        }),
      );

      const active = state.list[index];
      if (active) view.dom.setAttribute('aria-activedescendant', `slash-option-${active.id}`);

      const caret = view.coordsAtPos(state.trigger.to);
      const height = menu.offsetHeight;
      const fitsBelow = caret.bottom + 8 + height <= window.innerHeight;

      menu.style.left = `${Math.max(8, Math.min(caret.left, window.innerWidth - menu.offsetWidth - 8))}px`;
      menu.style.top = `${fitsBelow ? caret.bottom + 8 : Math.max(8, caret.top - 8 - height)}px`;
    }

    return [
      new Plugin({
        key: new PluginKey('slashMenu'),

        props: {
          handleDOMEvents: {
            blur(view) {
              hide(view);

              return false;
            },
            focus(view) {
              render(view);

              return false;
            },
          },

          handleKeyDown(view, event) {
            const state = current(view.state);
            if (!state) return false;

            const handled = () => {
              event.preventDefault();
              event.stopPropagation();

              return true;
            };

            if (event.key === 'ArrowDown') {
              index = (index + 1) % state.list.length;
              render(view);

              return handled();
            }

            if (event.key === 'ArrowUp') {
              index = (index - 1 + state.list.length) % state.list.length;
              render(view);

              return handled();
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
              const item = state.list[index];
              if (item) run(state.trigger, item);

              return handled();
            }

            if (event.key === 'Escape') {
              dismissed = state.trigger;
              hide(view);

              return handled();
            }

            return false;
          },
        },

        view() {
          return {
            update(view) {
              render(view);
            },
            destroy() {
              menu?.remove();
              menu = null;
            },
          };
        },
      }),
    ];
  },
});
