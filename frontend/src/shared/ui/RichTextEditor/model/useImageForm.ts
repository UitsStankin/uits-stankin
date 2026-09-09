import { useState, type ChangeEvent, type RefObject } from 'react';

import { useImageUpload } from '@shared/api';
import type { FileCategory, FileUploadResponse } from '@shared/types';

import type { useBarSlot } from './useBarSlot';

/** Что уходит в документ по «Вставить». */
export interface ImageToInsert {
  src: string;
  /** Описание для `alt`. Пустое — картинка объявлена украшением. */
  alt: string;
}

/**
 * Строка вставки картинки: файл выбран, грузится, загружен или отклонён,
 * рядом — поле описания.
 *
 * Отдельно от `useRichTextEditor` по той же причине, что и строка ссылки:
 * там — что умеет редактор, здесь — как спрашивают файл и описание.
 *
 * Файл уходит на сервер сразу, как выбран, — до «Вставить»: адрес
 * картинки нужен документу в момент вставки, а не при сохранении формы
 * (docs/API.md, «Загрузка файлов»). Пока он грузится, человек набирает
 * описание; передумал — файл остаётся сиротой, которого уберёт фоновая
 * задача бэкенда, удалять его с фронта не нужно.
 *
 * Описание спрашивается, а не подставляется из имени файла: `IMG_2034`
 * диктору ничего не говорит. Пустое описание — тоже ответ: картинка
 * уходит с `alt=""`, и диктор её пропускает, а не читает адрес файла,
 * как было бы без атрибута вовсе.
 *
 * Хук не знает про экземпляр редактора намеренно: файл приходит и из
 * буфера обмена, то есть из обработчика **внутри** редактора, — и хук,
 * которому нужен готовый экземпляр, нельзя было бы вызвать до его
 * создания. Поэтому строка только отдаёт, что вставить (`take`),
 * а вставляет сборка.
 *
 * Скрытый `<input type="file">` тоже принадлежит сборке и приходит
 * ссылкой — как панель у `useModalBehavior`: ref, возвращённый из хука
 * в объекте, линтер компилятора считает чтением ref на рендере.
 *
 * Открыта строка или нет — тоже не здесь, а в общем месте под панелью
 * (`useBarSlot`): строка ссылки и строка картинки делят одну полосу,
 * и своим флагом каждая из них открывалась бы поверх соседней.
 */
export function useImageForm(
  category: FileCategory | undefined,
  inputRef: RefObject<HTMLInputElement | null>,
  slot: ReturnType<typeof useBarSlot>,
) {
  const [uploaded, setUploaded] = useState<FileUploadResponse | null>(null);
  const [alt, setAlt] = useState('');

  // Раздел не задан — картинок в этом поле нет: кнопки не будет, файл
  // из буфера пройдёт мимо. Хук при этом вызывается всё равно (правило
  // хуков), и раздел ему нужен только формально — `select` не позовут.
  const upload = useImageUpload(category ?? 'news', setUploaded);

  const canInsert = uploaded !== null && !upload.isUploading;

  /** Открыть диалог выбора файла — кнопка панели. */
  function pick() {
    inputRef.current?.click();
  }

  /** Файл выбран — в диалоге, из буфера или перетаскиванием. */
  function receive(file: File) {
    setUploaded(null);
    setAlt('');
    slot.show('image');
    upload.select(file);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) receive(file);
    // Тот же файл, выбранный второй раз (после отказа), должен снова
    // вызвать `change` — а без сброса значения браузер промолчит.
    event.target.value = '';
  }

  /**
   * Забрать картинку для вставки; строка при этом закрывается.
   * `null` — вставлять нечего: файл ещё грузится или отклонён.
   */
  function take(): ImageToInsert | null {
    if (uploaded === null || upload.isUploading) return null;

    slot.hide();

    return { src: uploaded.url, alt: alt.trim() };
  }

  return {
    /** Раздел задан — кнопка есть, буфер обмена перехватывается. */
    enabled: category !== undefined,
    isOpen: slot.isOpen('image'),
    onFileChange,
    pick,
    receive,
    take,
    close: slot.hide,
    alt,
    setAlt,
    /** Адрес загруженной картинки для миниатюры; `null` — показывать нечего. */
    previewUrl: uploaded?.url ?? null,
    isUploading: upload.isUploading,
    error: upload.error,
    canInsert,
  };
}
