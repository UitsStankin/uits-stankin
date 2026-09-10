import type { FormEventHandler, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import {
  DEGREE_CODES,
  DEGREE_LABELS,
  RANK_CODES,
  RANK_LABELS,
} from '@shared/config/teacherDictionaries';
import { cn } from '@shared/lib';
import { ImagePicker } from '@shared/ui/ImagePicker';
import { SelectField, TextAreaField, TextField } from '@shared/ui/FormFields';
import { RichTextEditor } from '@shared/ui/RichTextEditor';

import type { TeacherCardFormValues } from '../model/teacherCardSchema';

interface TeacherCardFormProps {
  register: UseFormRegister<TeacherCardFormValues>;
  /** Для rich-text полей: они не элементы ввода и живут через `Controller`. */
  control: Control<TeacherCardFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  /** Ошибки полей: и от zod, и разложенные из ответа сервера. */
  fieldErrors: FieldErrors<TeacherCardFormValues>;
  /** Ошибка, не привязанная к полю. `null` — баннера нет. */
  formError: string | null;
  isPending: boolean;
  avatarPreviewUrl: string | null;
  avatarError: string | null;
  isUploadingAvatar: boolean;
  onAvatarSelect: (file: File) => void;
  /**
   * Убрать фото. Не передан — кнопки нет вовсе.
   *
   * Передаёт его только модератор. У преподавателя её нет намеренно:
   * `PUT /api/teachers/me` очистку принимает, но карточку ППС видят
   * посетители, и решение убрать с неё лицо стоит отдельного разговора
   * с кафедрой — а не одного клика в личном кабинете.
   */
  onAvatarRemove?: () => void;
  /**
   * Что стоит между полями карточки и кнопками.
   *
   * Слот, а не набор пропсов под каждый случай: у преподавателя здесь
   * строка про дисциплины, которых он не правит, у модератора — сами
   * дисциплины и связь с учётной записью. Общего у этих двух вещей
   * ровно одно — место, и описывать их форме незачем.
   */
  beforeActions?: ReactNode;
  /** Подпись кнопки отправки: у новой карточки это не «Сохранить». */
  submitLabel?: string;
}

const RICH_TEXT_FIELDS = [
  { name: 'education', label: 'Образование' },
  { name: 'qualification', label: 'Повышение квалификации' },
] as const;

const DEGREE_OPTIONS = DEGREE_CODES.map((code) => ({ value: code, label: DEGREE_LABELS[code] }));
const RANK_OPTIONS = RANK_CODES.map((code) => ({ value: code, label: RANK_LABELS[code] }));

/**
 * Форма карточки ППС. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами из хука
 * (`useMyTeacherCardForm` в кабинете, `useTeacherAdminForm` в админке).
 *
 * Одна форма на обоих: восемнадцать полей карточки у них общие до буквы,
 * потому что общий у них `TeacherRequestDto`. Различия вынесены в три
 * пропса — кнопка удаления фото, слот перед кнопками и подпись отправки,
 * — и это ровно те различия, которые есть на самом деле.
 *
 * Полей много, но это не жадность формы, а контракт: `PUT` — полная
 * замена, карточка правится целиком.
 */
export function TeacherCardForm({
  register,
  control,
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
  beforeActions,
  submitLabel = 'Сохранить',
}: TeacherCardFormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      {/* Фото: предпросмотр и выбор файла. Загрузка уходит сразу при
          выборе, до «Сохранить», — в кружке то, что вернул сервер.
          Кнопка удаления появляется, только если её дали: разбор
          у пропса `onAvatarRemove`. */}
      <ImagePicker
        variant="avatar"
        previewUrl={avatarPreviewUrl}
        isUploading={isUploadingAvatar}
        error={avatarError}
        onSelect={onAvatarSelect}
        onRemove={onAvatarRemove}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="teacher-last-name"
          label="Фамилия"
          autoComplete="family-name"
          error={fieldErrors.lastName?.message}
          registration={register('lastName')}
        />
        <TextField
          id="teacher-first-name"
          label="Имя"
          autoComplete="given-name"
          error={fieldErrors.firstName?.message}
          registration={register('firstName')}
        />
        <TextField
          id="teacher-patronymic"
          label="Отчество"
          autoComplete="additional-name"
          error={fieldErrors.patronymic?.message}
          registration={register('patronymic')}
        />
        <TextField
          id="teacher-position"
          label="Должность"
          error={fieldErrors.position?.message}
          registration={register('position')}
        />

        <SelectField
          id="teacher-degree"
          label="Учёная степень"
          emptyLabel="Без степени"
          options={DEGREE_OPTIONS}
          error={fieldErrors.degree?.message}
          registration={register('degree')}
        />
        <SelectField
          id="teacher-rank"
          label="Учёное звание"
          emptyLabel="Без звания"
          options={RANK_OPTIONS}
          error={fieldErrors.rank?.message}
          registration={register('rank')}
        />

        <TextField
          id="teacher-experience"
          label="Общий стаж, лет"
          inputMode="numeric"
          error={fieldErrors.experience?.message}
          registration={register('experience')}
        />
        <TextField
          id="teacher-professional-experience"
          label="Стаж по специальности, лет"
          inputMode="numeric"
          error={fieldErrors.professionalExperience?.message}
          registration={register('professionalExperience')}
        />

        <TextField
          id="teacher-phone"
          label="Телефон"
          autoComplete="tel"
          error={fieldErrors.phoneNumber?.message}
          registration={register('phoneNumber')}
        />
        <TextField
          id="teacher-email"
          label="Электронная почта"
          autoComplete="email"
          error={fieldErrors.email?.message}
          registration={register('email')}
        />
        <TextField
          id="teacher-messenger"
          label="Мессенджер"
          placeholder="@username"
          error={fieldErrors.messenger?.message}
          registration={register('messenger')}
        />
      </div>

      {/* Образование и повышение квалификации — rich-text поля контракта:
          сервер чистит их санитайзером, а карточка ППС показывает
          разметкой. В обычной textarea преподаватель видел здесь теги
          и правил их руками — F-41. Биография ниже осталась текстовым
          полем: её сервер как раз не чистит и выводится она текстом. */}
      {RICH_TEXT_FIELDS.map(({ name, label }) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field }) => (
            <RichTextEditor
              id={`teacher-${name}`}
              label={label}
              value={field.value}
              onChange={field.onChange}
              error={fieldErrors[name]?.message}
            />
          )}
        />
      ))}
      <TextAreaField
        id="teacher-bio"
        label="Биография"
        error={fieldErrors.bio?.message}
        registration={register('bio')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="teacher-exam-graduation"
          label="Расписание экзаменов: выпускные курсы"
          placeholder="Ссылка на PDF"
          error={fieldErrors.examScheduleGraduation?.message}
          registration={register('examScheduleGraduation')}
        />
        <TextField
          id="teacher-exam-non-graduation"
          label="Расписание экзаменов: невыпускные курсы"
          placeholder="Ссылка на PDF"
          error={fieldErrors.examScheduleNonGraduation?.message}
          registration={register('examScheduleNonGraduation')}
        />
      </div>

      {beforeActions}

      <div className="flex gap-3">
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
