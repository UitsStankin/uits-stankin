import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import type { FileCategory } from '@shared/types';

import { slideOfImage, slidesOfTable, slidesToSpec, type Slide } from '../lib/gallery';
import { GalleryView } from '../ui/GalleryView';

export interface GalleryOptions {
  /** Раздел хранилища для новых фото; не задан — фото добавить нельзя, только смотреть. */
  category: FileCategory | undefined;
}

/**
 * Фото-блок: одно фото с подписью или карусель. Заменяет штатную
 * картинку там, где поле — документ: разбор и сохранение описаны
 * в `lib/gallery.ts`.
 *
 * Разбирает и обычный `<img>`, и таблицу из фото; всё остальное, включая
 * обычные таблицы, оставляет прежним разбору.
 */
export const Gallery = Node.create<GalleryOptions>({
  name: 'gallery',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return { category: undefined };
  },

  addAttributes() {
    return { slides: { default: [] as Slide[], rendered: false } };
  },

  parseHTML() {
    return [
      {
        tag: 'table',
        getAttrs: (element) => {
          const slides = typeof element === 'string' ? null : slidesOfTable(element);

          return slides ? { slides } : false;
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          const slide = typeof element === 'string' ? null : slideOfImage(element);

          return slide ? { slides: [slide] } : false;
        },
      },
    ];
  },

  renderHTML({ node }) {
    return slidesToSpec(node.attrs.slides as Slide[]);
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
});
