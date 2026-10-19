import { afterEach, describe, expect, it, vi } from 'vitest';

import { enhanceGalleries } from './enhanceGalleries';

function rootOf(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);

  return root;
}

const GALLERY =
  '<table><tbody><tr>' +
  '<td><img src="/a.png" alt=""><small>Первая</small></td>' +
  '<td><img src="/b.png" alt=""><small>Вторая</small></td>' +
  '<td><img src="/c.png" alt=""></td>' +
  '</tr></tbody></table>';

afterEach(() => {
  document.body.replaceChildren();
});

describe('enhanceGalleries', () => {
  it('превращает таблицу из фото в карусель со счётчиком и стрелками', () => {
    const root = rootOf(`<p>Текст</p>${GALLERY}`);

    enhanceGalleries(root);

    expect(root.querySelector('table')).toHaveClass('u-gallery');
    expect(root.querySelector('.u-gallery-box')).not.toBeNull();
    expect(root.querySelector('.u-gallery-count')).toHaveTextContent('1 / 3');
    expect(root.querySelector('[aria-label="Предыдущее фото"]')).toBeDisabled();
    expect(root.querySelector('[aria-label="Следующее фото"]')).toBeEnabled();
  });

  it('листает по стрелке на одно фото', () => {
    const root = rootOf(GALLERY);
    enhanceGalleries(root);

    const row = root.querySelector('tr') as HTMLElement;
    const scrollBy = vi.fn();
    row.scrollBy = scrollBy;

    (root.querySelector('[aria-label="Следующее фото"]') as HTMLButtonElement).click();

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ left: expect.any(Number) }));
  });

  it('у одного фото стрелок нет, но подпись и оформление остаются', () => {
    const root = rootOf(
      '<table><tbody><tr><td><img src="/a.png" alt=""><small>Подпись</small></td></tr></tbody></table>',
    );

    enhanceGalleries(root);

    expect(root.querySelector('table')).toHaveClass('u-gallery');
    expect(root.querySelector('.u-gallery-nav')).toBeNull();
  });

  it('обычную таблицу не трогает', () => {
    const root = rootOf('<table><tbody><tr><td>Год</td><td>2026</td></tr></tbody></table>');

    enhanceGalleries(root);

    expect(root.querySelector('table')).not.toHaveClass('u-gallery');
    expect(root.querySelector('.u-gallery-box')).toBeNull();
  });

  it('второй вызов ничего не удваивает', () => {
    const root = rootOf(GALLERY);

    enhanceGalleries(root);
    enhanceGalleries(root);

    expect(root.querySelectorAll('.u-gallery-nav')).toHaveLength(1);
  });
});
