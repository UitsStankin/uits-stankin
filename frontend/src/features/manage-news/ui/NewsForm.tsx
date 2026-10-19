import type { FormEventHandler, KeyboardEvent } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormRegisterReturn,
} from 'react-hook-form';

import { POST_TYPES, postTypeLabel } from '@entities/news';
import { cn, errorId } from '@shared/lib';
import { FormActions } from '@shared/ui/FormActions';
import { CheckboxField, SelectField, TextField } from '@shared/ui/FormFields';
import { ImagePicker } from '@shared/ui/ImagePicker';
import { RichTextEditor } from '@shared/ui/RichTextEditor';

import type { NewsFormValues } from '../model/newsSchema';

interface NewsFormProps {
  register: UseFormRegister<NewsFormValues>;
  /** Для rich-text поля: оно не элемент ввода и живёт через `Controller`. */
  control: Control<NewsFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<NewsFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  coverUrl: string | null;
  hasCover: boolean;
  coverError: string | null;
  isUploadingCover: boolean;
  onCoverSelect: (file: File) => void;
  onCoverRemove: () => void;
}

const POST_TYPE_OPTIONS = POST_TYPES.map((value) => ({ value, label: postTypeLabel(value) }));

function saveOnCtrlS(event: KeyboardEvent<HTMLFormElement>) {
  if (!(event.ctrlKey || event.metaKey) || event.code !== 'KeyS') return;

  event.preventDefault();
  event.currentTarget.requestSubmit();
}

/**
 * Форма новости или объявления, собранная как документ: заголовок
 * и краткое описание без рамок прямо на странице, под ними текст
 * на всю ширину колонки, а тип, обложка и флажок «Опубликовать» — справа
 * отдельной колонкой параметров. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами из
 * `model/useNewsForm.ts`.
 *
 * Содержание — общий rich-text редактор в виде документа, и раздел
 * хранилища для его картинок называет здесь форма: права на загрузку
 * зависят от раздела, и знать про них редактору незачем.
 */
export function NewsForm({
  register,
  control,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  coverUrl,
  hasCover,
  coverError,
  isUploadingCover,
  onCoverSelect,
  onCoverRemove,
}: NewsFormProps) {
  return (
    <form onSubmit={onSubmit} onKeyDown={saveOnCtrlS} noValidate className="u-doc">
      <div className="u-doc-main">
        {formError && (
          <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
            {formError}
          </p>
        )}

        <BareField
          id="news-title"
          label="Заголовок"
          placeholder="Заголовок"
          className="u-doc-title"
          error={fieldErrors.title?.message}
          registration={register('title')}
          onEnter={() => document.getElementById('news-short-description')?.focus()}
        />

        <BareField
          id="news-short-description"
          label="Краткое описание"
          placeholder="Краткое описание: оно показывается в ленте новостей"
          className="u-doc-summary"
          error={fieldErrors.shortDescription?.message}
          registration={register('shortDescription')}
        />

        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              id="news-content"
              label="Содержание"
              variant="document"
              placeholder="Начните писать текст новости…"
              value={field.value}
              onChange={field.onChange}
              error={fieldErrors.content?.message}
              disabled={isPending}
              imageCategory="news"
            />
          )}
        />
      </div>

      <aside className="u-doc-side" aria-label="Параметры записи">
        {/* Без пустого значения: тип записи обязателен, и «не выбрано»
            предлагало бы отправить форму в состояние, которое сервер
            отклонит. */}
        <SelectField
          id="news-post-type"
          label="Тип записи"
          options={POST_TYPE_OPTIONS}
          error={fieldErrors.postType?.message}
          registration={register('postType')}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-base font-bold text-text-heading">Обложка</span>

          <ImagePicker
            variant="cover"
            previewUrl={coverUrl}
            isUploading={isUploadingCover}
            error={coverError}
            onSelect={onCoverSelect}
            onRemove={onCoverRemove}
          />
        </div>

        {/* Описание обложки спрашивается только вместе с обложкой: без
            картинки оно ничего не описывает. Это текст атрибута `alt` —
            то, что услышит диктор вместо картинки, и оставлять его пустым
            можно, но осознанно. */}
        {hasCover && (
          <TextField
            id="news-preview-image-description"
            label="Описание обложки"
            placeholder="Что на картинке"
            error={fieldErrors.previewImageDescription?.message}
            registration={register('previewImageDescription')}
          />
        )}

        <CheckboxField
          id="news-display"
          label="Опубликовать"
          hint="Снятый флажок оставляет запись черновиком: на сайте её не видно."
          error={fieldErrors.display?.message}
          registration={register('display')}
        />
      </aside>

      <FormActions isPending={isPending} onCancel={onCancel} />
    </form>
  );
}

/**
 * Поле без рамки для заголовка и краткого описания документа: строка
 * растёт вместе с текстом, подпись есть только у диктора. Enter в нём
 * не переводит строку, а передаёт фокус дальше, если ему сказали куда.
 */
function BareField({
  id,
  label,
  placeholder,
  className,
  error,
  registration,
  onEnter,
}: {
  id: string;
  label: string;
  placeholder: string;
  className: string;
  error?: string;
  registration: UseFormRegisterReturn;
  onEnter?: () => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || !onEnter) return;

    event.preventDefault();
    onEnter();
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <textarea
        id={id}
        rows={1}
        placeholder={placeholder}
        className={cn('u-doc-bare', className)}
        aria-invalid={error !== undefined}
        aria-describedby={error && errorId(id)}
        onKeyDown={onKeyDown}
        {...registration}
      />
      {error && (
        <p id={errorId(id)} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
