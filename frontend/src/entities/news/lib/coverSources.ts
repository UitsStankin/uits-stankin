import type { News } from '@shared/types';

/**
 * Ширина слота обложки в карточке ленты, CSS-пиксели: `sm:w-56` в `NewsCard`.
 * Ниже `sm` (576px) картинка встаёт над текстом во всю ширину карточки.
 */
const CARD_COVER_WIDTH = 224;
const SM_BREAKPOINT = 576;

/**
 * Ширины, под которыми файлы заявлены браузеру. Миниатюру хранилище вписывает
 * в 240×240, полную обложку — в 1600 по длинной стороне (docs/API.md, «Обложка
 * новости»). Это потолки, а не точные размеры: у снимка, который меньше
 * потолка, файл уже. Для выбора хватает и потолка — браузер сравнивает его
 * с шириной слота, умноженной на плотность экрана.
 */
const THUMBNAIL_WIDTH = 240;
const FULL_WIDTH = 1600;

export type CoverSources = {
  src: string;
  srcSet?: string;
  sizes?: string;
};

/**
 * Атрибуты `<img>` обложки в ленте, либо `null`, если обложки нет.
 *
 * Миниатюра не подставляется вместо полной картинки, а предлагается рядом
 * с ней, и выбирает браузер. Слот на широком экране — 224 пикселя: обычному
 * монитору миниатюры в 240 хватает, а экрану двойной плотности нужно 448, и
 * на нём она растянулась бы почти вдвое; на телефоне слот во всю ширину. Там
 * правильный выбор — полный файл, и `srcset` с `sizes` даёт его сам, без
 * знания о плотности экрана в коде.
 *
 * `src` — полный файл: его возьмёт браузер, не понимающий `srcset`, и он же
 * единственный у записей, заведённых до появления миниатюр (`null` в поле).
 */
export function coverSources(
  news: Pick<News, 'previewImageUrl' | 'previewThumbnailUrl'>,
): CoverSources | null {
  const full = news.previewImageUrl;

  if (!full) {
    return null;
  }

  const thumbnail = news.previewThumbnailUrl;

  if (!thumbnail) {
    return { src: full };
  }

  return {
    src: full,
    srcSet: `${thumbnail} ${THUMBNAIL_WIDTH}w, ${full} ${FULL_WIDTH}w`,
    sizes: `(min-width: ${SM_BREAKPOINT}px) ${CARD_COVER_WIDTH}px, 100vw`,
  };
}
