import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';
import { TextField } from '@shared/ui/FormFields';
import { ImagePicker } from '@shared/ui/ImagePicker';

import type { HelperFormValues } from '../model/helperSchema';

interface HelperFormProps {
  register: UseFormRegister<HelperFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<HelperFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  avatarPreviewUrl: string | null;
  avatarError: string | null;
  isUploadingAvatar: boolean;
  onAvatarSelect: (file: File) => void;
  onAvatarRemove: () => void;
  /** Подпись кнопки отправки: у новой карточки это не «Сохранить». */
  submitLabel: string;
}

/**
 * Форма карточки УВП. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами
 * из `model/useHelperForm.ts`.
 *
 * Полей четыре и фото — вся карточка. Ни степеней, ни званий,
 * ни дисциплин, ни связи с учётной записью у УВП нет по контракту,
 * и это не урезанная карточка ППС, а своя сущность.
 *
 * Всё в одну колонку, как у формы новости, и по той же причине: панель
 * шириной 576 px, а `sm:grid-cols-2` считает ширину экрана, а не панели, —
 * на десктопе он сработал бы и сжал поля вдвое внутри узкой панели.
 */
export function HelperForm({
  register,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  avatarPreviewUrl,
  avatarError,
  isUploadingAvatar,
  onAvatarSelect,
  onAvatarRemove,
  submitLabel,
}: HelperFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-base font-bold text-text-heading">Фото</span>

        {/* Загрузка уходит сразу при выборе, до «Сохранить», — в кружке
            то, что вернул сервер. Кнопка удаления есть, в отличие
            от личного кабинета: это чужая карточка, и снять фото
            уволившегося сотрудника надо уметь. */}
        <ImagePicker
          variant="avatar"
          previewUrl={avatarPreviewUrl}
          isUploading={isUploadingAvatar}
          error={avatarError}
          onSelect={onAvatarSelect}
          onRemove={onAvatarRemove}
        />
      </div>

      <TextField
        id="helper-last-name"
        label="Фамилия"
        autoComplete="family-name"
        error={fieldErrors.lastName?.message}
        registration={register('lastName')}
      />

      <TextField
        id="helper-first-name"
        label="Имя"
        autoComplete="given-name"
        error={fieldErrors.firstName?.message}
        registration={register('firstName')}
      />

      <TextField
        id="helper-patronymic"
        label="Отчество"
        autoComplete="additional-name"
        error={fieldErrors.patronymic?.message}
        registration={register('patronymic')}
      />

      <TextField
        id="helper-position"
        label="Должность"
        placeholder="инженер кафедры"
        error={fieldErrors.position?.message}
        registration={register('position')}
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
          {isPending ? 'Сохраняем…' : submitLabel}
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
