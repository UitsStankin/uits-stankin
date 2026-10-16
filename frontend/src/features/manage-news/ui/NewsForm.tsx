import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { POST_TYPES, postTypeLabel } from '@entities/news';
import { cn } from '@shared/lib';
import { CheckboxField, SelectField, TextAreaField, TextField } from '@shared/ui/FormFields';
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

/**
 * Форма новости или объявления. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами из
 * `model/useNewsForm.ts`.
 *
 * Поля — общие (`shared/ui/FormFields`), те же, что у карточки ППС,
 * профиля и дисциплины. Содержание — общий rich-text редактор (F-41),
 * и раздел хранилища для его картинок называет здесь форма: права
 * на загрузку зависят от раздела, и знать про них редактору незачем.
 *
 * Всё в одну колонку, хотя у карточки ППС поля стоят по два в ряд:
 * панель формы шириной 576 px, и заголовок новости в половине этой
 * ширины обрезался бы на середине.
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="news-title"
        label="Заголовок"
        error={fieldErrors.title?.message}
        registration={register('title')}
      />

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

      <TextAreaField
        id="news-short-description"
        label="Краткое описание"
        rows={3}
        error={fieldErrors.shortDescription?.message}
        registration={register('shortDescription')}
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

      <Controller
        name="content"
        control={control}
        render={({ field }) => (
          <RichTextEditor
            id="news-content"
            label="Содержание"
            value={field.value}
            onChange={field.onChange}
            error={fieldErrors.content?.message}
            disabled={isPending}
            imageCategory="news"
          />
        )}
      />

      {/* Флажок рядом с кнопкой сохранения, а не в начале формы: это
          последнее решение перед отправкой, и здесь его видно вместе
          с тем, что оно означает. */}
      <CheckboxField
        id="news-display"
        label="Опубликовать"
        hint="Снятый флажок оставляет запись черновиком: на сайте её не видно."
        error={fieldErrors.display?.message}
        registration={register('display')}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isPending}
          className={cn(
            'flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5',
            'text-base font-bold text-white transition',
            'hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isPending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
          {isPending ? 'Сохраняем…' : 'Сохранить'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={cn(
            'rounded border border-default px-4 py-2.5 text-base font-bold text-text-heading',
            'transition hover:border-primary hover:text-primary',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
