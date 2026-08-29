import type { ComponentProps } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { cn } from '@shared/lib';

/**
 * Поля формы карточки: текст, селект, многострочное. Чистые: значение
 * ведёт react-hook-form через `registration`, ошибка приходит пропсом.
 *
 * Один файл на три компонента — у них одна причина для изменения:
 * вид поля формы. Живут в фиче, а не в `shared/ui`: у входа и смены
 * пароля сегодня своя такая же разметка, и сводить всё в общий примитив
 * стоит вместе с формами админки (F-40), когда потребителей станет
 * много, — по тому же правилу, что `PasswordField`.
 */

const inputClass = cn(
  'w-full rounded border border-gray-300 bg-white px-3 py-2',
  'text-base text-text-default placeholder:text-text-muted',
  'transition-colors focus:border-primary focus:ring-0',
  'aria-invalid:border-danger',
);

interface FieldBaseProps {
  id: string;
  label: string;
  /** Текст ошибки под полем; `undefined` — ошибки нет. */
  error?: string;
  /** Результат `register(...)` из react-hook-form. */
  registration: UseFormRegisterReturn;
}

/** Подпись сверху, сообщение об ошибке снизу — общий каркас всех полей. */
function FieldShell({
  id,
  label,
  error,
  children,
}: Pick<FieldBaseProps, 'id' | 'label' | 'error'> & { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-bold text-text-heading">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Атрибуты доступности, одинаковые у всех трёх полей. */
function ariaProps(id: string, error: string | undefined) {
  return {
    'aria-invalid': error !== undefined,
    'aria-describedby': error && `${id}-error`,
  };
}

export function TextField({
  id,
  label,
  error,
  registration,
  ...inputProps
}: FieldBaseProps & Pick<ComponentProps<'input'>, 'autoComplete' | 'inputMode' | 'placeholder'>) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <input id={id} type="text" className={inputClass} {...ariaProps(id, error)} {...inputProps} {...registration} />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  error,
  registration,
  emptyLabel,
  options,
}: FieldBaseProps & {
  /** Подпись пустого значения — «Без степени», «Без звания». */
  emptyLabel: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <FieldShell id={id} label={label} error={error}>
      {/* Родной select: опций меньше десятка, поиск не нужен, а клавиатура,
          мобильные списки и диктор достаются бесплатно. */}
      <select id={id} className={inputClass} {...ariaProps(id, error)} {...registration}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  registration,
  rows = 4,
}: FieldBaseProps & { rows?: number }) {
  return (
    <FieldShell id={id} label={label} error={error}>
      <textarea id={id} rows={rows} className={inputClass} {...ariaProps(id, error)} {...registration} />
    </FieldShell>
  );
}
