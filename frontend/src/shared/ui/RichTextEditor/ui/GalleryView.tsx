import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { ArrowLeft, ArrowRight, GripVertical, LoaderCircle, Plus, Trash2, X } from 'lucide-react';

import { describeUploadError, uploadFile } from '@shared/api';
import { IMAGE_ACCEPT, checkImageFile } from '@shared/lib';
import type { FileCategory } from '@shared/types';

import type { Slide } from '../lib/gallery';

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="u-gal-icon" aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function leaveOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key !== 'Enter' && event.key !== 'Escape') return;

  event.preventDefault();
  event.currentTarget.blur();
}

/**
 * Фото-блок внутри текста: одно фото с подписью или карусель.
 *
 * Все фото блока видны сразу, рядком, и под каждым своя подпись — писать
 * подпись можно там же, где смотришь на снимок. Порядок меняют стрелки
 * на фото, лишнее убирают крестиком, новые добавляют плиткой в конце.
 * Блок целиком двигают за «ручку» в заголовке: тянуть за само фото
 * мешало бы выделять подпись.
 */
export function GalleryView({ node, editor, getPos, selected, deleteNode, extension }: NodeViewProps) {
  const slides = node.attrs.slides as Slide[];
  const category = extension.options.category as FileCategory | undefined;
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function change(update: (current: Slide[]) => Slide[]) {
    const pos = getPos();
    if (pos === undefined) return;

    editor
      .chain()
      .command(({ tr }) => {
        const current = tr.doc.nodeAt(pos);
        if (!current) return false;

        const next = update(current.attrs.slides as Slide[]);

        if (next.length === 0) tr.delete(pos, pos + current.nodeSize);
        else tr.setNodeMarkup(pos, undefined, { ...current.attrs, slides: next });

        return true;
      })
      .run();
  }

  function patch(index: number, part: Partial<Slide>) {
    change((current) => current.map((slide, i) => (i === index ? { ...slide, ...part } : slide)));
  }

  function move(index: number, step: -1 | 1) {
    change((current) => {
      const target = index + step;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target] as Slide, next[index] as Slide];

      return next;
    });
  }

  async function addFiles(files: File[]) {
    if (!category || files.length === 0) return;

    setError(null);
    setUploading(files.length);
    let failure: string | null = null;

    for (const file of files) {
      const refusal = checkImageFile(file);

      if (refusal !== null) {
        failure = refusal;
      } else {
        try {
          const uploaded = await uploadFile(file, category);
          change((current) => [...current, { src: uploaded.url, alt: '', caption: '' }]);
        } catch (cause) {
          failure = describeUploadError(cause);
        }
      }

      setUploading((left) => left - 1);
    }

    if (failure !== null) setError(failure);
  }

  function onFilesChosen(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    void addFiles(files);
  }

  return (
    <NodeViewWrapper className="u-gal" data-selected={selected ? '' : undefined} data-count={slides.length}>
      <div className="u-gal-head">
        <span className="u-gal-grip" data-drag-handle title="Потяните, чтобы переставить блок">
          <GripVertical aria-hidden="true" size={16} />
          {slides.length > 1 ? `Карусель · ${slides.length} фото` : 'Фото'}
        </span>

        <div className="u-gal-actions">
          {category !== undefined && (
            <button
              type="button"
              className="u-gal-remove"
              disabled={uploading > 0}
              onClick={() => fileInput.current?.click()}
            >
              <Plus aria-hidden="true" size={15} />
              Добавить фото
            </button>
          )}

          <button type="button" className="u-gal-remove" onClick={() => deleteNode()}>
            <Trash2 aria-hidden="true" size={15} />
            Удалить блок
          </button>
        </div>
      </div>

      <div className="u-gal-strip">
        {slides.map((slide, index) => (
          <figure key={`${index}-${slide.src}`} className="u-gal-card">
            <div className="u-gal-media">
              <img src={slide.src} alt={slide.alt} draggable={false} />

              <div className="u-gal-tools">
                {index > 0 && (
                  <IconButton label="Сдвинуть влево" onClick={() => move(index, -1)}>
                    <ArrowLeft aria-hidden="true" size={16} />
                  </IconButton>
                )}
                {index < slides.length - 1 && (
                  <IconButton label="Сдвинуть вправо" onClick={() => move(index, 1)}>
                    <ArrowRight aria-hidden="true" size={16} />
                  </IconButton>
                )}
                <IconButton label="Убрать фото" onClick={() => change((c) => c.filter((_, i) => i !== index))}>
                  <X aria-hidden="true" size={16} />
                </IconButton>
              </div>
            </div>

            <input
              className="u-gal-caption"
              defaultValue={slide.caption}
              placeholder="Подпись к фото"
              aria-label={`Подпись к фото ${index + 1}`}
              onChange={(event) => patch(index, { caption: event.target.value })}
              onKeyDown={leaveOnEnter}
            />
          </figure>
        ))}

        {category !== undefined && (
          <button
            type="button"
            className="u-gal-add"
            disabled={uploading > 0}
            onClick={() => fileInput.current?.click()}
          >
            {uploading > 0 ? (
              <>
                <LoaderCircle aria-hidden="true" size={22} className="animate-spin" />
                Загружаю…
              </>
            ) : (
              <>
                <Plus aria-hidden="true" size={22} />
                Добавить фото
                <small>{slides.length === 1 ? 'получится карусель' : 'в эту карусель'}</small>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="u-gal-error">
          {error}
        </p>
      )}

      {category !== undefined && (
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={onFilesChosen}
        />
      )}
    </NodeViewWrapper>
  );
}
