import type { DOMOutputSpec } from '@tiptap/pm/model';

/**
 * Фото-блок: одна картинка с подписью или карусель из нескольких.
 *
 * Белый список бэкенда (`Safelist.relaxed()`) не знает ни `figure`,
 * ни `figcaption`, ни атрибута `class`, поэтому блок хранится таблицей,
 * каждая ячейка которой — одно фото с подписью в `<small>`. Таблица
 * проходит чистку без потерь (проверено на jsoup 1.23.2), а там, где
 * блок не умеют показывать каруселью, он остаётся читаемым: фото в ряд
 * и подписи под ними.
 *
 * Одно фото без подписи хранится обычным `<img>`: так выглядел любой
 * снимок в тексте до блока, и такая разметка остаётся прежней.
 */
export interface Slide {
  src: string;
  /** Описание для тех, кто не видит картинку. Пустое — картинка-украшение. */
  alt: string;
  /** Подпись под фото. Пустая — подписи нет. */
  caption: string;
}

/** Фото из `<img>`; `null` — у картинки нет адреса, и показывать нечего. */
export function slideOfImage(image: Element): Slide | null {
  const src = image.getAttribute('src');
  if (!src) return null;

  return { src, alt: image.getAttribute('alt') ?? '', caption: '' };
}

/**
 * Фото из таблицы; `null` — это не карусель, а обычная таблица
 * (заголовочные ячейки, ячейка без картинки), и разбирать её надо
 * как раньше.
 */
export function slidesOfTable(table: Element): Slide[] | null {
  const cells = Array.from(table.querySelectorAll('td'));
  if (cells.length === 0 || table.querySelector('th') !== null) return null;

  const slides: Slide[] = [];

  for (const cell of cells) {
    const image = cell.querySelector('img');
    const slide = image ? slideOfImage(image) : null;
    if (!slide) return null;

    slides.push({ ...slide, caption: (cell.querySelector('small')?.textContent ?? '').trim() });
  }

  return slides;
}

function cellSpec(slide: Slide): DOMOutputSpec {
  const image: DOMOutputSpec = ['img', { src: slide.src, alt: slide.alt }];

  return slide.caption === ''
    ? ['td', {}, image]
    : ['td', {}, image, ['small', {}, slide.caption]];
}

/** Разметка блока для сохранения. */
export function slidesToSpec(slides: readonly Slide[]): DOMOutputSpec {
  const [only] = slides;

  if (slides.length === 1 && only && only.caption === '') {
    return ['img', { src: only.src, alt: only.alt }];
  }

  return ['table', {}, ['tbody', {}, ['tr', {}, ...slides.map(cellSpec)]]];
}
