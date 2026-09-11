import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { cn } from '@shared/lib';
import { TextField } from '@shared/ui/FormFields';
import { MarkdownEditor } from '@shared/ui/MarkdownEditor';

import type { EditablePageFormValues } from '../model/editablePageSchema';

interface EditablePageFormProps {
  register: UseFormRegister<EditablePageFormValues>;
  /** Для исходника: поле Markdown управляемое и живёт через `Controller`. */
  control: Control<EditablePageFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<EditablePageFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
}

/**
 * Форма раздела. Чистая: всё приходит пропсами из
 * `model/useEditablePageForm.ts`.
 *
 * Два поля, и второе — не rich-text редактор, а правка исходника
 * Markdown с предпросмотром (`shared/ui/MarkdownEditor`): в базе лежит
 * исходник, и WYSIWYG переписал бы разметку модератора в свою.
 *
 * Картинки уходят в раздел хранилища `pages` — его завёл T-79 ровно под
 * эту форму, и адрес из ответа встаёт в текст как `![](/media/...)`.
 */
export function EditablePageForm({
  register,
  control,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
}: EditablePageFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="editable-page-title"
        label="Подпись раздела"
        error={fieldErrors.title?.message}
        registration={register('title')}
      />

      <Controller
        name="text"
        control={control}
        render={({ field }) => (
          <MarkdownEditor
            id="editable-page-text"
            label="Текст раздела"
            value={field.value}
            onChange={field.onChange}
            error={fieldErrors.text?.message}
            disabled={isPending}
            imageCategory="pages"
          />
        )}
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
