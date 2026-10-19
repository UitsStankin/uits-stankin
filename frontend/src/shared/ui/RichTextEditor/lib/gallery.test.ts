import { describe, expect, it } from 'vitest';

import { slideOfImage, slidesOfTable, slidesToSpec, type Slide } from './gallery';

function elementOf(html: string, selector: string): Element {
  const root = document.createElement('div');
  root.innerHTML = html;
  const element = root.querySelector(selector);
  if (!element) throw new Error(`нет ${selector}`);

  return element;
}

describe('slideOfImage', () => {
  it('берёт адрес и описание', () => {
    const image = elementOf('<img src="/media/a.png" alt="Вид сверху">', 'img');

    expect(slideOfImage(image)).toEqual({ src: '/media/a.png', alt: 'Вид сверху', caption: '' });
  });

  it('без адреса отвечает null', () => {
    expect(slideOfImage(elementOf('<img alt="x">', 'img'))).toBeNull();
  });
});

describe('slidesOfTable', () => {
  it('собирает фото и подписи из ячеек по порядку', () => {
    const table = elementOf(
      '<table><tbody><tr>' +
        '<td><img src="/a.png" alt="А"><small>Первая</small></td>' +
        '<td><img src="/b.png" alt=""></td>' +
        '</tr></tbody></table>',
      'table',
    );

    expect(slidesOfTable(table)).toEqual([
      { src: '/a.png', alt: 'А', caption: 'Первая' },
      { src: '/b.png', alt: '', caption: '' },
    ]);
  });

  it('обычную таблицу с текстом не трогает', () => {
    const table = elementOf('<table><tbody><tr><td>Текст</td></tr></tbody></table>', 'table');

    expect(slidesOfTable(table)).toBeNull();
  });

  it('таблицу с заголовочными ячейками не трогает', () => {
    const table = elementOf(
      '<table><thead><tr><th>Год</th></tr></thead><tbody><tr><td><img src="/a.png"></td></tr></tbody></table>',
      'table',
    );

    expect(slidesOfTable(table)).toBeNull();
  });

  it('таблицу, где у одной ячейки нет картинки, не трогает', () => {
    const table = elementOf(
      '<table><tbody><tr><td><img src="/a.png"></td><td>просто текст</td></tr></tbody></table>',
      'table',
    );

    expect(slidesOfTable(table)).toBeNull();
  });
});

describe('slidesToSpec', () => {
  const one: Slide = { src: '/a.png', alt: '', caption: '' };

  it('одно фото без подписи хранится обычным img', () => {
    expect(slidesToSpec([one])).toEqual(['img', { src: '/a.png', alt: '' }]);
  });

  it('одно фото с подписью хранится таблицей из одной ячейки', () => {
    expect(slidesToSpec([{ ...one, caption: 'Подпись' }])).toEqual([
      'table',
      {},
      [
        'tbody',
        {},
        ['tr', {}, ['td', {}, ['img', { src: '/a.png', alt: '' }], ['small', {}, 'Подпись']]],
      ],
    ]);
  });

  it('карусель — это ряд ячеек, подпись только там, где она есть', () => {
    const spec = slidesToSpec([one, { src: '/b.png', alt: 'Б', caption: 'Вторая' }]) as unknown as unknown[];
    const row = ((spec[2] as unknown[])[2] as unknown[]);

    expect(row.slice(2)).toEqual([
      ['td', {}, ['img', { src: '/a.png', alt: '' }]],
      ['td', {}, ['img', { src: '/b.png', alt: 'Б' }], ['small', {}, 'Вторая']],
    ]);
  });
});
