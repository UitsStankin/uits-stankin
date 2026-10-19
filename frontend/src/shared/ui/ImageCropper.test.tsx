import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageCropper } from './ImageCropper';

const drawImage = vi.fn();
const fillRect = vi.fn();

beforeEach(() => {
  drawImage.mockClear();
  fillRect.mockClear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    fillRect,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => {
    callback(new Blob(['x'], { type: type ?? 'image/jpeg' }));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function drawn() {
  const call = drawImage.mock.calls.at(-1) as number[];
  return { sx: call[1], sy: call[2], source: call[3], side: call[7] };
}

function open(file: File, handlers = { onApply: vi.fn(), onCancel: vi.fn() }, size = [1000, 500]) {
  const view = render(<ImageCropper file={file} url="blob:test" {...handlers} />);
  const image = view.container.querySelector('img') as HTMLImageElement;
  Object.defineProperty(image, 'naturalWidth', { value: size[0], configurable: true });
  Object.defineProperty(image, 'naturalHeight', { value: size[1], configurable: true });
  fireEvent.load(image);
  return { ...handlers, image };
}

describe('ImageCropper', () => {
  it('режет по центру квадрат во всю короткую сторону', () => {
    const { onApply } = open(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));

    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    const { sx, sy, source, side } = drawn();
    expect(sx).toBeCloseTo(250, 3);
    expect(sy).toBeCloseTo(0, 3);
    expect(source).toBeCloseTo(500, 3);
    expect(side).toBe(500);
    expect(onApply).toHaveBeenCalledOnce();
    const cropped = onApply.mock.calls[0][0] as File;
    expect(cropped.name).toBe('photo.jpg');
    expect(cropped.type).toBe('image/jpeg');
  });

  it('масштаб сужает область вокруг центра', () => {
    open(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));

    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    const { sx, sy, source, side } = drawn();
    expect(sx).toBeCloseTo(375, 3);
    expect(sy).toBeCloseTo(125, 3);
    expect(source).toBeCloseTo(250, 3);
    expect(side).toBe(250);
  });

  it('стрелки двигают область и не выпускают её за края фото', () => {
    open(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));

    const view = screen.getByRole('group');
    for (let i = 0; i < 100; i += 1) fireEvent.keyDown(view, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    const { sx, sy } = drawn();
    expect(sx).toBeCloseTo(500, 3);
    expect(sy).toBeCloseTo(0, 3);
  });

  it('PNG остаётся PNG и не заливается белым', () => {
    const { onApply } = open(new File(['x'], 'logo.png', { type: 'image/png' }));

    fireEvent.click(screen.getByRole('button', { name: 'Применить' }));

    const cropped = onApply.mock.calls[0][0] as File;
    expect(cropped.type).toBe('image/png');
    expect(cropped.name).toBe('logo.png');
    expect(fillRect).not.toHaveBeenCalled();
  });

  it('до загрузки фото применить нельзя, Escape закрывает окно', () => {
    const handlers = { onApply: vi.fn(), onCancel: vi.fn() };
    render(<ImageCropper file={new File(['x'], 'a.jpg', { type: 'image/jpeg' })} url="blob:test" {...handlers} />);

    expect(screen.getByRole('button', { name: 'Применить' })).toBeDisabled();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handlers.onCancel).toHaveBeenCalledOnce();
    expect(handlers.onApply).not.toHaveBeenCalled();
  });

  it('если фото не открылось, предлагает загрузить как есть', () => {
    const file = new File(['x'], 'broken.jpg', { type: 'image/jpeg' });
    const handlers = { onApply: vi.fn(), onCancel: vi.fn() };
    const view = render(<ImageCropper file={file} url="blob:test" {...handlers} />);

    fireEvent.error(view.container.querySelector('img') as HTMLImageElement);

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось открыть фото для обрезки.');
    fireEvent.click(screen.getByRole('button', { name: 'Загрузить как есть' }));

    expect(handlers.onApply).toHaveBeenCalledWith(file);
  });
});
