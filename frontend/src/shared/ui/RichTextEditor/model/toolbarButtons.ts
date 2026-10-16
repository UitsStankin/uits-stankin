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
  RemoveFormatting,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  type LucideIcon,
} from 'lucide-react';

import type { ToolbarAction } from './useRichTextEditor';

export interface ToolbarButton {
  action: ToolbarAction;
  /** Имя кнопки: подсказка мыши и то, что читает диктор. */
  label: string;
  icon: LucideIcon;
  /** Перед кнопкой начинается новая группа — рисуется разделителем. */
  startsGroup?: boolean;
}

/**
 * Панель форматирования: четырнадцать кнопок и ни одной лишней.
 *
 * Набор — это пересечение двух списков: что было в панели старого Quill
 * (`uits/settings.py`, `QUILL_CONFIGS`) и что переживает чистку
 * `Safelist.relaxed()` на бэкенде. Из старой панели поэтому **не**
 * перенесены:
 *
 * * цвет текста и фона, шрифт, размер, выравнивание и отступы — Quill
 *   рисует их классами и атрибутом `style`, а белый список не разрешает
 *   ни того, ни другого. Кнопка красила бы текст в поле и не красила
 *   на странице;
 * * видео и формула — это `<iframe>` и `<span class="ql-formula">`,
 *   их санитайзер вырезает целиком;
 * * направление текста справа налево — оно приехало из демо шаблона,
 *   на кафедральном портале ему взяться неоткуда;
 * «Картинка» есть только у поля, которому сказали, куда грузить
 * (`imageCategory`): без раздела хранилища ей нечего вставлять, и в панели
 * её нет — список для панели фильтрует сборка. Разметку с картинками
 * редактор понимает в любом случае, разбор в `extensions.ts`.
 *
 * Заголовок первого уровня не предлагается намеренно: `h1` на странице
 * уже занят названием записи, и второй такой заголовок внутри текста —
 * это дефект доступности, а не форматирование. Разметку с `h1` редактор
 * всё равно открывает и сохраняет: в перенесённых текстах он встречается.
 */
export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { action: 'bold', label: 'Жирный', icon: Bold },
  { action: 'italic', label: 'Курсив', icon: Italic },
  { action: 'underline', label: 'Подчёркнутый', icon: Underline },
  { action: 'strike', label: 'Зачёркнутый', icon: Strikethrough },

  { action: 'heading2', label: 'Заголовок', icon: Heading2, startsGroup: true },
  { action: 'heading3', label: 'Подзаголовок', icon: Heading3 },

  { action: 'bulletList', label: 'Список', icon: List, startsGroup: true },
  { action: 'orderedList', label: 'Нумерованный список', icon: ListOrdered },
  { action: 'blockquote', label: 'Цитата', icon: Quote },

  { action: 'subscript', label: 'Нижний индекс', icon: Subscript, startsGroup: true },
  { action: 'superscript', label: 'Верхний индекс', icon: Superscript },

  { action: 'link', label: 'Ссылка', icon: Link2, startsGroup: true },
  { action: 'image', label: 'Картинка', icon: ImagePlus },
  { action: 'clear', label: 'Убрать форматирование', icon: RemoveFormatting },
];
