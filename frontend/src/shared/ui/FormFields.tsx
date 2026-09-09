import type { ComponentProps } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { cn, errorId, labelId } from '@shared/lib';

/**
 * Поля формы: текст, селект, многострочное. Чистые: значение ведёт
 * react-hook-form через `registration`, ошибка приходит пропсом.
 *
 * Один файл на три компонента — у них одна причина для изменения:
 * вид поля формы.
 *
 * Заведены в фиче правки карточки ППС (F-16) и перенесены сюда вторым
 * потребителем — формой профиля (F-27): та берёт `TextField` целиком,
 * и копия отличалась бы от оригинала ровно до первой правки одной из них.
 * Переезд планировался к формам админки (F-40), но ждать четвёртой копии
 * незачем — F-40 возьмёт готовое.
 *
 * Вход и смена пароля сюда пока не переведены: у них своя разметка
 * с кнопкой «показать пароль» (`features/change-password/ui/PasswordField`),
 * и сводить её с этой — отдельная работа, а не побочный эффект переезда.
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

/**
 * Подпись сверху, сообщение об ошибке снизу — общий каркас всех полей.
 *
 * Экспортируется ради rich-text редактора (F-41): у него своё содержимое,
 * но подпись, отступы и разметка ошибки обязаны совпадать с соседними
 * полями формы — а совпадают они только тогда, когда рисуются одним кодом.
 */
export function FieldShell({
  id,
  label,
  error,
  labelAsText = false,
  children,
}: Pick<FieldBaseProps, 'id' | 'label' | 'error'> & {
  /**
   * Подпись обычным текстом с идентификатором вместо `<label for>`.
   *
   * `<label for>` цепляется только к полям ввода; редактор — это
   * `contenteditable`, и подпись к нему привязывают через
   * `aria-labelledby`, которому нужен `id` самой подписи.
   */
  labelAsText?: boolean;
  children: React.ReactNode;
}) {
  const labelClass = 'text-base font-bold text-text-heading';

  return (
    <div className="flex flex-col gap-1.5">
      {labelAsText ? (
        <span id={labelId(id)} className={labelClass}>
          {label}
        </span>
      ) : (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p id={errorId(id)} className="text-sm text-danger">
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
    'aria-describedby': error && errorId(id),
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
