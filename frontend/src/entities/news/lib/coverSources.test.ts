import { describe, expect, it } from 'vitest';

import { coverSources } from './coverSources';

const FULL = '/media/news/2026/08/a3f9.jpg';
const THUMB = '/media/news/2026/08/a3f9_thumb.jpg';

describe('coverSources', () => {
  it('без обложки — показывать нечего', () => {
    expect(coverSources({ previewImageUrl: null, previewThumbnailUrl: null })).toBeNull();
  });

  it('запись до появления миниатюр — один полный файл, без srcset', () => {
    expect(coverSources({ previewImageUrl: FULL, previewThumbnailUrl: null })).toEqual({
      src: FULL,
    });
  });

  it('с миниатюрой — оба файла на выбор браузеру, полный остаётся в src', () => {
    const sources = coverSources({ previewImageUrl: FULL, previewThumbnailUrl: THUMB });

    expect(sources?.src).toBe(FULL);
    expect(sources?.srcSet).toBe(`${THUMB} 240w, ${FULL} 1600w`);
    expect(sources?.sizes).toBe('(min-width: 576px) 224px, 100vw');
  });
});
