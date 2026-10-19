import { getSchema } from '@tiptap/core';
import { DOMParser as PmParser, DOMSerializer } from '@tiptap/pm/model';
import { describe, expect, it } from 'vitest';

import { documentExtensions } from './extensions';

const schema = getSchema(documentExtensions({ category: 'news', onPickPhotos: null }));

function parse(html: string) {
  const body = new window.DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;

  return PmParser.fromSchema(schema).parse(body);
}

function serialize(doc: ReturnType<typeof parse>): string {
  const box = document.createElement('div');
  box.append(DOMSerializer.fromSchema(schema).serializeFragment(doc.content));

  return box.innerHTML;
}

const TABLE =
  '<table><tbody><tr>' +
  '<td><img src="/media/news/a.png" alt="Первое"><small>Подпись один</small></td>' +
  '<td><img src="/media/news/b.png" alt=""></td>' +
  '</tr></tbody></table>';

describe('фото-блок в документе', () => {
  it('таблица из фото открывается одним блоком с подписями', () => {
    const doc = parse(TABLE);

    expect(doc.childCount).toBe(1);
    expect(doc.firstChild?.type.name).toBe('gallery');
    expect(doc.firstChild?.attrs.slides).toEqual([
      { src: '/media/news/a.png', alt: 'Первое', caption: 'Подпись один' },
      { src: '/media/news/b.png', alt: '', caption: '' },
    ]);
  });

  it('карусель сохраняется той же таблицей, без потерь', () => {
    expect(serialize(parse(TABLE))).toBe(TABLE);
  });

  it('обычная картинка открывается блоком из одного фото и сохраняется картинкой', () => {
    const html = '<img src="/media/news/a.png" alt="Вид">';
    const doc = parse(html);

    expect(doc.firstChild?.type.name).toBe('gallery');
    expect(doc.firstChild?.attrs.slides).toHaveLength(1);
    expect(serialize(doc)).toBe(html);
  });

  it('картинка внутри абзаца режет его и встаёт блоком посередине', () => {
    const doc = parse('<p>До <img src="/a.png" alt=""> после</p>');

    expect(doc.content.content.map((node) => node.type.name)).toEqual([
      'paragraph',
      'gallery',
      'paragraph',
    ]);
  });

  it('таблицу с текстом не превращает в фото', () => {
    const doc = parse('<table><tbody><tr><td>Год</td><td>2026</td></tr></tbody></table>');

    expect(doc.content.content.some((node) => node.type.name === 'gallery')).toBe(false);
  });
});
