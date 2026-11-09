import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';
import { CheckboxField, TextAreaField, TextField } from '@shared/ui/FormFields';
import { ImagePicker } from '@shared/ui/ImagePicker';
import { RichTextEditor } from '@shared/ui/RichTextEditor';

import type { ConferenceFormValues } from '../model/conferenceSchema';

interface ConferenceFormProps {
  register: UseFormRegister<ConferenceFormValues>;
  /** Для rich-text поля: оно не элемент ввода и живёт через `Controller`. */
  control: Control<ConferenceFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<ConferenceFormValues>;
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

/**
 * Форма объявления о конференции. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами из
 * `model/useConferenceForm.ts`.
 *
 * Порядок полей — как в карточке на сайте и как в старой админке Django:
 * что за конференция, когда, кто проводит и как связаться, потом картинка
 * и текст. Даты и контакты стоят в ряд: поля у них короткие, а панель
 * формы в 576 px вмещает три выбора даты без переноса.
 *
 * «Название», а не «Заголовок»: у новости поле ввода и кнопка панели
 * редактора зовутся одинаково, и различать их пришлось ролью (F-43).
 * Здесь это ещё и честнее — у конференции название, а не заголовок статьи.
 */
export function ConferenceForm({
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
}: ConferenceFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="conference-title"
        label="Название"
        error={fieldErrors.title?.message}
        registration={register('title')}
      />

      <TextAreaField
        id="conference-description"
        label="Краткое описание"
        rows={3}
        error={fieldErrors.description?.message}
        registration={register('description')}
      />

      {/* Однодневной конференции дата окончания не нужна: равная дате
          начала она всё равно сохранится как пустая (docs/API.md). */}
      <div className="grid gap-5 sm:grid-cols-3">
        <TextField
          id="conference-start-date"
          type="date"
          label="Дата начала"
          error={fieldErrors.startDate?.message}
          registration={register('startDate')}
        />

        <TextField
          id="conference-end-date"
          type="date"
          label="Дата окончания"
          error={fieldErrors.endDate?.message}
          registration={register('endDate')}
        />

        <TextField
          id="conference-time"
          type="time"
          label="Время начала"
          error={fieldErrors.time?.message}
          registration={register('time')}
        />
      </div>

      <TextField
        id="conference-organizer"
        label="Организатор"
        error={fieldErrors.organizer?.message}
        registration={register('organizer')}
      />

      {/* `autoComplete="off"`: это контакты конференции, а не того, кто
          заполняет форму, — браузер подставил бы сюда почту модератора. */}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="conference-contact-email"
          type="email"
          label="Почта для связи"
          autoComplete="off"
          error={fieldErrors.contactEmail?.message}
          registration={register('contactEmail')}
        />

        <TextField
          id="conference-contact-phone"
          type="tel"
          label="Телефон для связи"
          autoComplete="off"
          error={fieldErrors.contactPhone?.message}
          registration={register('contactPhone')}
        />
      </div>

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
          картинки оно ничего не описывает. */}
      {hasCover && (
        <TextField
          id="conference-preview-image-description"
          label="Описание обложки"
          placeholder="Что на картинке"
          error={fieldErrors.previewImageDescription?.message}
          registration={register('previewImageDescription')}
        />
      )}

      {/* Картинки внутри текста — в раздел `news`, как и обложка: у раздела
          хранилища нет своего имени под конференции (docs/API.md). */}
      <Controller
        name="content"
        control={control}
        render={({ field }) => (
          <RichTextEditor
            id="conference-content"
            label="Содержание"
            value={field.value}
            onChange={field.onChange}
            error={fieldErrors.content?.message}
            disabled={isPending}
            imageCategory="news"
          />
        )}
      />

      <CheckboxField
        id="conference-display"
        label="Опубликовать"
        hint="Снятый флажок оставляет объявление черновиком: на сайте его не видно."
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
