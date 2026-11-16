import type { FormEventHandler } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Controller, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form';

import { EVENT_STATUS_LABELS } from '@entities/event';
import { cn, errorId, hintId } from '@shared/lib';
import { CheckboxField, FieldShell, SelectField, TextAreaField, TextField } from '@shared/ui/FormFields';
import type { EventPerson, EventStatus, UserDirectoryEntry } from '@shared/types';

import type { EventFormValues } from '../model/eventSchema';
import { AssigneesField } from './AssigneesField';

const STATUS_OPTIONS = (Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((status) => ({
  value: status,
  label: EVENT_STATUS_LABELS[status],
}));

interface EventFormProps {
  register: UseFormRegister<EventFormValues>;
  control: Control<EventFormValues>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
  fieldErrors: FieldErrors<EventFormValues>;
  formError: string | null;
  isPending: boolean;
  /** «Весь день» отмечен: поля времени не нужны. */
  allDay: boolean;
  accounts: readonly UserDirectoryEntry[];
  knownAssignees: readonly EventPerson[];
  isDirectoryLoading: boolean;
  hasDirectoryFailed: boolean;
  /** Цвет события не по контракту, заменённый умолчанием; `null` — замены нет. */
  replacedColor: string | null;
  submitLabel: string;
}

/**
 * Форма события календаря. Чистая: всё приходит пропсами
 * из `model/useEventForm.ts`.
 *
 * **Дата и время — четыре родных поля**, а не выбор промежутка, как
 * в оригинале (`bsDaterangepicker` и два `timepicker`): родные поля
 * дают клавиатуру, мобильный выбор и диктор даром, и строки у них ровно
 * те, что нужны для перевода в момент.
 *
 * Прошедшая дата не запрещена, хотя оригинал её не давал выбрать
 * (`minDate: today`): контракт её принимает, а записать задним числом
 * прошедшее заседание — обычное дело.
 *
 * Частоты напоминаний в форме нет — напоминаний нет (ARCHITECTURE.md §8,
 * п. 14), — и кнопки «Уведомление» с Telegram тоже.
 */
export function EventForm({
  register,
  control,
  onSubmit,
  onCancel,
  fieldErrors,
  formError,
  isPending,
  allDay,
  accounts,
  knownAssignees,
  isDirectoryLoading,
  hasDirectoryFailed,
  replacedColor,
  submitLabel,
}: EventFormProps) {
  const colorId = 'event-color';
  const colorError = fieldErrors.color?.message;
  const colorDescribedBy = [replacedColor && hintId(colorId), colorError && errorId(colorId)]
    .filter(Boolean)
    .join(' ');

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && (
        <p role="alert" className="rounded bg-danger/10 px-3 py-2 text-base text-danger">
          {formError}
        </p>
      )}

      <TextField
        id="event-name"
        label="Название"
        error={fieldErrors.name?.message}
        registration={register('name')}
      />

      <CheckboxField
        id="event-all-day"
        label="Весь день"
        error={fieldErrors.allDay?.message}
        registration={register('allDay')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="event-start-date"
          type="date"
          label="Дата начала"
          error={fieldErrors.startDate?.message}
          registration={register('startDate')}
        />

        {!allDay && (
          <TextField
            id="event-start-time"
            type="time"
            label="Время начала"
            error={fieldErrors.startTime?.message}
            registration={register('startTime')}
          />
        )}

        <TextField
          id="event-end-date"
          type="date"
          label="Дата окончания"
          error={fieldErrors.endDate?.message}
          registration={register('endDate')}
        />

        {!allDay && (
          <TextField
            id="event-end-time"
            type="time"
            label="Время окончания"
            error={fieldErrors.endTime?.message}
            registration={register('endTime')}
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          id="event-status"
          label="Статус"
          options={STATUS_OPTIONS}
          error={fieldErrors.status?.message}
          registration={register('status')}
        />

        <FieldShell id={colorId} label="Цвет" error={colorError}>
          <input
            id={colorId}
            type="color"
            className="h-10 w-20 cursor-pointer rounded border border-gray-300 bg-white p-1"
            aria-invalid={colorError !== undefined}
            aria-describedby={colorDescribedBy === '' ? undefined : colorDescribedBy}
            {...register('color')}
          />
          {replacedColor && (
            <p id={hintId(colorId)} className="text-sm text-text-muted">
              {`Сохранённый цвет «${replacedColor}» записан не по формату — показан цвет по умолчанию, он и сохранится, если не выбрать другой.`}
            </p>
          )}
        </FieldShell>
      </div>

      <TextAreaField
        id="event-description"
        label="Описание"
        rows={4}
        error={fieldErrors.description?.message}
        registration={register('description')}
      />

      <Controller
        name="assignedUserIds"
        control={control}
        render={({ field }) => (
          <AssigneesField
            accounts={accounts}
            known={knownAssignees}
            value={field.value}
            onChange={field.onChange}
            isLoading={isDirectoryLoading}
            hasFailed={hasDirectoryFailed}
            error={fieldErrors.assignedUserIds?.message}
            disabled={isPending}
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
