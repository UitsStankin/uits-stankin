import { describe, expect, it } from 'vitest';

import { filterSlashItems } from './slashItems';

const ids = (query: string, photos = true) =>
  filterSlashItems(query, { photos }).map((item) => item.id);

describe('filterSlashItems', () => {
  it('без запроса отдаёт все блоки', () => {
    expect(ids('')).toEqual([
      'heading2',
      'heading3',
      'bulletList',
      'orderedList',
      'blockquote',
      'photo',
    ]);
  });

  it('ищет по названию без учёта регистра', () => {
    expect(ids('ЦИТ')).toEqual(['blockquote']);
  });

  it('ищет по ключевым словам, в том числе английским', () => {
    expect(ids('gallery')).toEqual(['photo']);
    expect(ids('h2')).toEqual(['heading2']);
  });

  it('без раздела хранилища не предлагает фото', () => {
    expect(ids('', false)).not.toContain('photo');
    expect(ids('фото', false)).toEqual([]);
  });
});
