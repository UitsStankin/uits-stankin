import type { Editor } from '@tiptap/react';

import type { Slide } from '../lib/gallery';
import { blockPosition } from './blockPosition';

/**
 * Фото-блок в документ: туда, где курсор, а если дано `pos` — рядом
 * с абзацем, на который уронили файлы.
 *
 * Лёг блок последним — после него добавляется пустой абзац: после
 * картинки-«атома» иначе некуда поставить курсор, и текст дальше
 * не набрать.
 */
export function insertGallery(editor: Editor, slides: Slide[], pos?: number) {
  const gallery = { type: 'gallery', attrs: { slides } };
  const chain = editor.chain().focus();

  if (pos === undefined) chain.insertContent(gallery);
  else chain.insertContentAt(blockPosition(editor, pos), gallery);

  chain.run();

  const { doc } = editor.state;

  if (doc.lastChild?.type.name === 'gallery') {
    editor.chain().insertContentAt(doc.content.size, { type: 'paragraph' }).run();
  }
}
