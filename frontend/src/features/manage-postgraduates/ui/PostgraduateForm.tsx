import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { TeacherSelect } from '@entities/teacher';
import { cn } from '@shared/lib';
import type { TeacherListItem } from '@shared/types';
import { TextAreaField, TextField } from '@shared/ui/FormFields';

import type { PostgraduateFormValues } from '../model/postgraduateSchema';

interface PostgraduateFormProps {
  register: UseFormRegister<PostgraduateFormValues>;
  /** Для выбора руководителя: он живёт через `Controller`. */
  control: Control<PostgraduateFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<PostgraduateFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  teachers: readonly TeacherListItem[];
  isLoadingTeachers: boolean;
  hasTeachersFailed: boolean;
  /** Подпись кнопки отправки: у новой записи это не «Сохранить». */
  submitLabel: string;
}

/**
 * Форма записи аспирантуры. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами
 * из `model/usePostgraduateForm.ts`.
 *
 * Полей два сорта, и порядок формы это показывает: сперва аспирант —
 * ФИО, группа, год поступления, — потом его научная работа:
 * специальность, тема, руководитель. Так же они разложены в таблице
 * на сайте, только группы там нет.
 *
 * Год — текстовое поле с цифровой клавиатурой, а не `type="number"`:
 * у числового поля колесо мыши меняет значение под курсором, а `2024`
 * в нём — не величина, которую крутят, а метка набора.
 */
export function PostgraduateForm({
  register,
  control,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  teachers,
  isLoadingTeachers,
  hasTeachersFailed,
  submitLabel,
}: PostgraduateFormProps) {
  const student = fieldErrors.student;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="postgraduate-last-name"
        label="Фамилия"
        error={student?.lastName?.message}
        registration={register('student.lastName')}
      />

      <TextField
        id="postgraduate-first-name"
        label="Имя"
        error={student?.firstName?.message}
        registration={register('student.firstName')}
      />

      <TextField
        id="postgraduate-patronymic"
        label="Отчество"
        error={student?.patronymic?.message}
        registration={register('student.patronymic')}
      />

      <TextField
        id="postgraduate-group"
        label="Группа"
        error={student?.group?.message}
        registration={register('student.group')}
      />

      <TextField
        id="postgraduate-admission-year"
        label="Год поступления"
        inputMode="numeric"
        placeholder={String(new Date().getFullYear())}
        error={student?.admissionYear?.message}
        registration={register('student.admissionYear')}
      />

      <TextField
        id="postgraduate-speciality"
        label="Научная специальность"
        placeholder="2.3.1"
        error={student?.speciality?.message}
        registration={register('student.speciality')}
      />

      <TextAreaField
        id="postgraduate-diploma-theme"
        label="Тема диссертации"
        rows={3}
        error={student?.diplomaTheme?.message}
        registration={register('student.diplomaTheme')}
      />

      <Controller
        name="teacherId"
        control={control}
        render={({ field }) => (
          <TeacherSelect
            id="postgraduate-teacher"
            label="Научный руководитель"
            noneLabel="Не назначен"
            hint="Без руководителя запись остаётся в таблице на сайте с пометкой «не назначен»."
            teachers={teachers}
            value={field.value}
            onChange={field.onChange}
            // Подписи руководителя в записи формы нет — контракт отдаёт
            // только `teacherId`. Пункт для карточки вне списка подпишется
            // номером: так бывает с архивной карточкой (F-53).
            currentName={null}
            isLoading={isLoadingTeachers}
            hasFailed={hasTeachersFailed}
            error={
              fieldErrors.teacherId?.message ??
              (hasTeachersFailed ? 'Не удалось загрузить список преподавателей' : undefined)
            }
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
