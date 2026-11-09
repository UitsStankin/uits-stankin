import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';
import type { TeacherListItem } from '@shared/types';
import { CheckboxField, TextAreaField, TextField } from '@shared/ui/FormFields';
import { ImagePicker } from '@shared/ui/ImagePicker';
import { RichTextEditor } from '@shared/ui/RichTextEditor';

import type { AchievementFormValues } from '../model/achievementSchema';
import { TeacherField } from './TeacherField';

interface AchievementFormProps {
  register: UseFormRegister<AchievementFormValues>;
  /** Для rich-text поля и выбора преподавателя: оба живут через `Controller`. */
  control: Control<AchievementFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<AchievementFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  coverUrl: string | null;
  /** Нет обложки, отказ по ключу или отказ загрузки. `null` — сообщения нет. */
  coverError: string | null;
  isUploadingCover: boolean;
  onCoverSelect: (file: File) => void;
  teachers: readonly TeacherListItem[];
  currentTeacherName: string | null;
  isLoadingTeachers: boolean;
  hasTeachersFailed: boolean;
}

/**
 * Форма достижения. Чистая: всё приходит пропсами из
 * `model/useAchievementForm.ts`.
 *
 * Порядок полей — как в старой админке Django: что за достижение, чьё,
 * потом картинка и текст. У обложки нет кнопки «Убрать» и нет поля
 * описания: первое контракт запрещает (обложка обязательна), второго
 * у достижения нет в схеме вовсе — его не было и в старой модели.
 */
export function AchievementForm({
  register,
  control,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  coverUrl,
  coverError,
  isUploadingCover,
  onCoverSelect,
  teachers,
  currentTeacherName,
  isLoadingTeachers,
  hasTeachersFailed,
}: AchievementFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="achievement-title"
        label="Название"
        error={fieldErrors.title?.message}
        registration={register('title')}
      />

      <TextAreaField
        id="achievement-description"
        label="Краткое описание"
        rows={3}
        error={fieldErrors.description?.message}
        registration={register('description')}
      />

      <Controller
        name="teacherId"
        control={control}
        render={({ field }) => (
          <TeacherField
            teachers={teachers}
            value={field.value}
            onChange={field.onChange}
            currentName={currentTeacherName}
            isLoading={isLoadingTeachers}
            hasFailed={hasTeachersFailed}
            error={
              fieldErrors.teacherId?.message ??
              (hasTeachersFailed ? 'Не удалось загрузить список преподавателей' : undefined)
            }
          />
        )}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-base font-bold text-text-heading">Обложка</span>

        <ImagePicker
          variant="cover"
          previewUrl={coverUrl}
          isUploading={isUploadingCover}
          error={coverError}
          onSelect={onCoverSelect}
        />
      </div>

      {/* Картинки внутри текста — в раздел `achievements`, как и обложка. */}
      <Controller
        name="content"
        control={control}
        render={({ field }) => (
          <RichTextEditor
            id="achievement-content"
            label="Содержание"
            value={field.value}
            onChange={field.onChange}
            error={fieldErrors.content?.message}
            disabled={isPending}
            imageCategory="achievements"
          />
        )}
      />

      <CheckboxField
        id="achievement-display"
        label="Опубликовать"
        hint="Снятый флажок оставляет достижение черновиком: на сайте его не видно."
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
