import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  type LucideIcon,
} from 'lucide-react';

import type { MarkdownCommand } from '../lib/markdownCommands';

/** Действие кнопки: команда над текстом или выбор картинки. */
export type ToolbarAction = MarkdownCommand | 'image';

export interface ToolbarButton {
  action: ToolbarAction;
  /** Имя кнопки: подсказка мыши и то, что читает диктор. */
  label: string;
  icon: LucideIcon;
  /** Перед кнопкой начинается новая группа — рисуется разделителем. */
  startsGroup?: boolean;
}

/**
 * Панель правки Markdown — девять кнопок.
 *
 * Подписи и значки те же, что у rich-text редактора
 * (`shared/ui/RichTextEditor/model/toolbarButtons.ts`): модератор правит
 * обоими полями, и «Список» в одной форме не должен зваться иначе
 * в соседней. Набор и порядок — как у старого `angular-markdown-editor`,
 * разбор в `lib/markdownCommands.ts`.
 *
 * «Картинка» стоит в списке всегда, а убирает её сборка — у поля, которому
 * форма не назвала раздел хранилища. Тем же правилом живёт rich-text
 * редактор.
 */
export const MARKDOWN_TOOLBAR: readonly ToolbarButton[] = [
  { action: 'heading2', label: 'Заголовок', icon: Heading2 },
  { action: 'heading3', label: 'Подзаголовок', icon: Heading3 },

  { action: 'bold', label: 'Жирный', icon: Bold, startsGroup: true },
  { action: 'italic', label: 'Курсив', icon: Italic },

  { action: 'link', label: 'Ссылка', icon: Link2, startsGroup: true },
  { action: 'image', label: 'Картинка', icon: ImagePlus },

  { action: 'bulletList', label: 'Список', icon: List, startsGroup: true },
  { action: 'orderedList', label: 'Нумерованный список', icon: ListOrdered },
  { action: 'quote', label: 'Цитата', icon: Quote },
];
