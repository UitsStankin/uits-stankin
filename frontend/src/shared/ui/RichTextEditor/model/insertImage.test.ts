import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { richTextExtensions } from './extensions';
import { insertImage } from './useRichTextEditor';

const IMAGE = { src: '/media/news/a.png', alt: '' };

let editor: Editor;

function makeEditor(content: string) {
  editor = new Editor({ extensions: richTextExtensions, content });

  return editor;
}

function blocks() {
  return editor.getJSON().content?.map((node) => node.type);
}

afterEach(() => {
  editor.destroy();
});

describe('insertImage', () => {
  it('без места ставит картинку туда, где курсор', () => {
    makeEditor('<p>Первый</p><p>Второй</p>');
    editor.commands.setTextSelection(3);

    insertImage(editor, IMAGE);

    expect(editor.getHTML()).toContain('<img src="/media/news/a.png"');
  });

  it('роняя файл в первую половину абзаца, ставит картинку перед ним', () => {
    makeEditor('<p>Первый</p><p>Второй абзац</p>');
    // Второй абзац начинается с позиции 8, его текст — с 9: позиция 10 — после первой буквы.
    insertImage(editor, IMAGE, 10);

    expect(blocks()).toEqual(['paragraph', 'image', 'paragraph']);
    expect(editor.getText()).toContain('Второй абзац');
  });

  it('роняя файл во вторую половину абзаца, ставит картинку после него', () => {
    makeEditor('<p>Первый</p><p>Второй абзац</p>');
    // Конец текста второго абзаца: 9 + 12 = 21.
    insertImage(editor, IMAGE, 20);

    expect(blocks()).toEqual(['paragraph', 'paragraph', 'image']);
  });

  it('не режет слово: оба абзаца остаются целыми', () => {
    makeEditor('<p>Первый</p><p>Второй абзац</p>');

    insertImage(editor, IMAGE, 14);

    const texts: string[] = [];
    editor.state.doc.forEach((node) => {
      if (node.type.name === 'paragraph') texts.push(node.textContent);
    });

    expect(texts).toEqual(['Первый', 'Второй абзац']);
  });

  it('позиция за концом документа не ломает вставку', () => {
    makeEditor('<p>Первый</p>');

    insertImage(editor, IMAGE, 9999);

    expect(blocks()).toContain('image');
  });
});
