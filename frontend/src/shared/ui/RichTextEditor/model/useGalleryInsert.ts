import { useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';

import { describeUploadError, uploadFile } from '@shared/api';
import { checkImageFile } from '@shared/lib';
import type { FileCategory } from '@shared/types';

import type { Slide } from '../lib/gallery';
import { insertGallery } from './insertGallery';

/**
 * Загрузка фото в документ: файлы уходят на сервер по очереди, а когда
 * все ответили — в текст ложится один блок, из одного фото или из нескольких.
 *
 * Место блока берётся в конце, а не в начале: пока файлы грузятся,
 * человек продолжает писать, и позиция, где их уронили, едет вместе
 * с текстом (`dropPosRef` обновляет сборка). Отказы не обрывают очередь:
 * годные фото всё равно ложатся в блок, а причина отказа остаётся
 * в строке состояния.
 */
export function useGalleryInsert(
  category: FileCategory | undefined,
  editorRef: RefObject<Editor | null>,
  dropPosRef: RefObject<number | null>,
) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function insertFiles(files: File[], pos?: number) {
    if (!category || files.length === 0) return;

    dropPosRef.current = pos ?? null;
    setError(null);
    setProgress({ done: 0, total: files.length });

    const slides: Slide[] = [];
    let failure: string | null = null;

    for (const file of files) {
      const refusal = checkImageFile(file);

      if (refusal !== null) {
        failure = refusal;
      } else {
        try {
          const uploaded = await uploadFile(file, category);
          slides.push({ src: uploaded.url, alt: '', caption: '' });
        } catch (cause) {
          failure = describeUploadError(cause);
        }
      }

      setProgress((current) => (current ? { ...current, done: current.done + 1 } : current));
    }

    const at = dropPosRef.current ?? undefined;
    dropPosRef.current = null;

    setProgress(null);
    setError(failure);

    const editor = editorRef.current;
    if (editor && !editor.isDestroyed && slides.length > 0) insertGallery(editor, slides, at);
  }

  return {
    insertFiles,
    /** Сколько файлов обработано из скольких; `null` — загрузки нет. */
    progress,
    error,
    clearError: () => setError(null),
  };
}
