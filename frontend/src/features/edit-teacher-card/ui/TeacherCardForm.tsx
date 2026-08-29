import type { ChangeEventHandler, FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import {
  DEGREE_CODES,
  DEGREE_LABELS,
  RANK_CODES,
  RANK_LABELS,
} from '@shared/config/teacherDictionaries';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { cn } from '@shared/lib';

import type { TeacherCardFormValues } from '../model/teacherCardSchema';
import { SelectField, TextAreaField, TextField } from './fields';

interface TeacherCardFormProps {
  register: UseFormRegister<TeacherCardFormValues>;
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
}

const DEGREE_OPTIONS = DEGREE_CODES.map((code) => ({ value: code, label: DEGREE_LABELS[code] }));
const RANK_OPTIONS = RANK_CODES.map((code) => ({ value: code, label: RANK_LABELS[code] }));

/**
 * Форма правки карточки ППС. Чистая: ничего не помнит, не запрашивает
 * и не решает, что считать ошибкой, — всё приходит пропсами
 * из `model/useTeacherCardForm.ts`.
 *
 * Полей много, но это не жадность формы, а контракт: `PUT` — полная
 * замена, преподаватель правит карточку целиком. Не правит он только
 * дисциплины — их назначает модератор, и в форме их нет.
 */
export function TeacherCardForm({
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
}: TeacherCardFormProps) {
  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) onAvatarSelect(file);
    // Тот же файл, выбранный второй раз (после ошибки загрузки), должен
    // снова вызвать `change` — а без сброса значения браузер промолчит.
    event.target.value = '';
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      {/* Фото: предпросмотр и выбор файла. Загрузка уходит сразу при
          выборе, до «Сохранить», — в кружке то, что вернул сервер. */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <img
            src={avatarPreviewUrl ?? DEFAULT_AVATAR_URL}
            alt=""
            aria-hidden
            className="h-28 w-28 rounded-full object-cover"
          />
          {isUploadingAvatar && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <LoaderCircle size={24} className="animate-spin text-primary" aria-hidden />
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className={cn(
              'cursor-pointer self-start rounded border border-default px-3 py-1.5',
              'text-sm font-bold text-text-heading transition hover:border-primary hover:text-primary',
            )}
          >
            Выбрать фото
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              disabled={isUploadingAvatar}
              onChange={handleFileChange}
            />
          </label>
          <p className="text-sm text-text-muted">JPEG или PNG, до 15 МБ.</p>
          {avatarError && (
            <p role="alert" className="text-sm text-danger">
              {avatarError}
            </p>
          )}
        </div>
      </div>

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

      <TextAreaField
        id="teacher-education"
        label="Образование"
        error={fieldErrors.education?.message}
        registration={register('education')}
      />
      <TextAreaField
        id="teacher-qualification"
        label="Повышение квалификации"
        error={fieldErrors.qualification?.message}
        registration={register('qualification')}
      />
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

      {/* Дисциплин в форме нет не по забывчивости: их назначает модератор,
          а присланное преподавателем поле бэкенд молча игнорирует. Строка
          отвечает на вопрос «а где мои дисциплины?» до того, как он задан. */}
      <p className="text-sm text-text-muted">
        Дисциплины назначает модератор кафедры — здесь они не редактируются.
      </p>

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
