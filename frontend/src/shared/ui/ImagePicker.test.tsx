import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';

import { ImagePicker } from './ImagePicker';

/**
 * Вариант аватара проверен формами кабинета (`pages/PersonalPage`);
 * у обложки потребителя ещё нет — её первой возьмёт форма новости
 * (F-43), — поэтому она проверяется здесь сама по себе.
 */
describe('ImagePicker, обложка', () => {
  const noop = () => undefined;

  it('без картинки показывает пустую рамку и не предлагает убрать', () => {
    const { container } = render(
      <ImagePicker
        variant="cover"
        previewUrl={null}
        isUploading={false}
        error={null}
        onSelect={noop}
        onRemove={noop}
      />,
    );

    // Чужая картинка на месте своей врала бы, что обложка есть.
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Убрать обложку' })).not.toBeInTheDocument();
    expect(screen.getByText('JPEG или PNG, до 15 МБ.')).toBeInTheDocument();
  });

  it('показывает обложку по адресу из ответа и даёт её убрать', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <ImagePicker
        variant="cover"
        previewUrl="/media/news/uploaded-1.jpg"
        isUploading={false}
        error={null}
        onSelect={noop}
        onRemove={onRemove}
      />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', '/media/news/uploaded-1.jpg');

    fireEvent.click(screen.getByRole('button', { name: 'Убрать обложку' }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('без обработчика удаления кнопки нет даже при картинке', () => {
    render(
      <ImagePicker
        variant="cover"
        previewUrl="/media/news/uploaded-1.jpg"
        isUploading={false}
        error={null}
        onSelect={noop}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Убрать обложку' })).not.toBeInTheDocument();
  });

  it('отдаёт выбранный файл наверх, а диалогу заранее говорит про формат', () => {
    const onSelect = vi.fn();
    render(
      <ImagePicker variant="cover" previewUrl={null} isUploading={false} error={null} onSelect={onSelect} />,
    );

    const input = screen.getByLabelText('Выбрать обложку');
    expect(input).toHaveAttribute('accept', 'image/jpeg,image/png');

    const file = new File(['x'], 'cover.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onSelect).toHaveBeenCalledWith(file);
  });

  it('пока файл уходит на сервер, выбор заблокирован', () => {
    render(<ImagePicker variant="cover" previewUrl={null} isUploading error={null} onSelect={noop} />);

    expect(screen.getByLabelText('Выбрать обложку')).toBeDisabled();
  });

  it('объявляет отказ загрузки', () => {
    render(
      <ImagePicker
        variant="cover"
        previewUrl={null}
        isUploading={false}
        error="Файл больше 15 МБ."
        onSelect={noop}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Файл больше 15 МБ.');
  });
});

describe('ImagePicker, аватар', () => {
  it('без фото показывает силуэт портала под своими подписями', () => {
    const { container } = render(
      <ImagePicker variant="avatar" previewUrl={null} isUploading={false} error={null} onSelect={() => undefined} />,
    );

    expect(container.querySelector('img')).toHaveAttribute('src', DEFAULT_AVATAR_URL);
    expect(screen.getByLabelText('Выбрать фото')).toBeInTheDocument();
  });
});

describe('ImagePicker, обрезка', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:photo');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function pick(onSelect: (file: File) => void, crop: boolean) {
    render(
      <ImagePicker
        variant="avatar"
        crop={crop}
        previewUrl={null}
        isUploading={false}
        error={null}
        onSelect={onSelect}
      />,
    );
  }

  function choose(file: File) {
    fireEvent.change(screen.getByLabelText('Выбрать фото'), { target: { files: [file] } });
  }

  it('с обрезкой не отдаёт файл наверх, пока окно не закрыто «Применить»', () => {
    const onSelect = vi.fn();
    pick(onSelect, true);

    choose(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));

    expect(screen.getByRole('dialog', { name: 'Обрезка фото' })).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('«Отмена» закрывает окно и ничего не отправляет', () => {
    const onSelect = vi.fn();
    pick(onSelect, true);
    choose(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('файл не того формата идёт наверх сразу, чтобы форма объяснила отказ', () => {
    const onSelect = vi.fn();
    pick(onSelect, true);
    const gif = new File(['x'], 'anim.gif', { type: 'image/gif' });

    choose(gif);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith(gif);
  });

  it('без обрезки отдаёт файл сразу, как раньше', () => {
    const onSelect = vi.fn();
    pick(onSelect, false);
    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    choose(photo);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith(photo);
  });
});
