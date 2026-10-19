import type { FormEventHandler } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { FormActions } from '@shared/ui/FormActions';
import { TextAreaField, TextField } from '@shared/ui/FormFields';

import type { SubjectFormValues } from '../model/subjectSchema';

interface SubjectFormProps {
  register: UseFormRegister<SubjectFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<SubjectFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
}

/**
 * Форма дисциплины. Чистая: ничего не помнит, не запрашивает и не решает,
 * что считать ошибкой, — всё приходит пропсами из
 * `model/useSubjectForm.ts`.
 *
 * Поля — общие (`shared/ui/FormFields`), те же, что у карточки ППС
 * и профиля. Ровно ради этого они туда и переехали с F-33: F-40 берёт
 * готовое, а подписи, отступы и разметка ошибки у четвёртой формы портала
 * совпадают с тремя предыдущими не по случайности.
 *
 * Кнопки внутри формы, а не в подвале окна: «Сохранить» — это `submit`,
 * и вынесенная в оболочку кнопка отправляла бы форму через `form=`
 * по идентификатору. Лишняя связка ради того же результата.
 */
export function SubjectForm({
  register,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
}: SubjectFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="subject-name"
        label="Название"
        error={fieldErrors.name?.message}
        registration={register('name')}
      />

      <TextAreaField
        id="subject-description"
        label="Описание"
        rows={5}
        error={fieldErrors.description?.message}
        registration={register('description')}
      />

      <FormActions isPending={isPending} onCancel={onCancel} />
    </form>
  );
}
