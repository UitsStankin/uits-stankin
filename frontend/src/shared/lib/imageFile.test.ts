import { describe, expect, it } from 'vitest';

import { checkImageFile, imageFileOf } from './imageFile';

/**
 * Файл заданного размера без выделения памяти под него: пятнадцать
 * мегабайт нулей ради одной проверки — лишняя секунда на раннере.
 */
function fileOf(name: string, type: string, size = 1): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });

  return file;
}

describe('checkImageFile', () => {
  it('пропускает JPEG и PNG', () => {
    expect(checkImageFile(fileOf('photo.jpg', 'image/jpeg'))).toBeNull();
    expect(checkImageFile(fileOf('scheme.png', 'image/png'))).toBeNull();
  });

  it('отказывает форматам, которые сервер отвергнет', () => {
    // GIF, WebP и SVG бэкенд не принимает — последний принципиально.
    expect(checkImageFile(fileOf('a.gif', 'image/gif'))).toBe('Подходят только JPEG и PNG.');
    expect(checkImageFile(fileOf('a.svg', 'image/svg+xml'))).toBe('Подходят только JPEG и PNG.');
    expect(checkImageFile(fileOf('a.pdf', 'application/pdf'))).toBe('Подходят только JPEG и PNG.');
  });

  it('отказывает файлу больше 15 МБ и пропускает ровно 15', () => {
    const limit = 15 * 1024 * 1024;

    expect(checkImageFile(fileOf('big.jpg', 'image/jpeg', limit + 1))).toBe('Файл больше 15 МБ.');
    expect(checkImageFile(fileOf('fit.jpg', 'image/jpeg', limit))).toBeNull();
  });
});

describe('imageFileOf', () => {
  it('находит картинку среди файлов, пропуская остальное', () => {
    const image = fileOf('a.png', 'image/png');
    const transfer = { files: [fileOf('a.pdf', 'application/pdf'), image] } as unknown as DataTransfer;

    expect(imageFileOf(transfer)).toBe(image);
  });

  it('отдаёт GIF дальше — отказ с объяснением лучше молчания', () => {
    const gif = fileOf('a.gif', 'image/gif');

    expect(imageFileOf({ files: [gif] } as unknown as DataTransfer)).toBe(gif);
  });

  it('без файлов отвечает null', () => {
    expect(imageFileOf(null)).toBeNull();
    expect(imageFileOf({ files: [] } as unknown as DataTransfer)).toBeNull();
  });
});
