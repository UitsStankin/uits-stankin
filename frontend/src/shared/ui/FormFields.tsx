import type { ComponentProps } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { cn, errorId, labelId } from '@shared/lib';

/**
 * Поля формы: текст, селект, многострочное, флажок. Чистые: значение ведёт
 * react-hook-form через `registration`, ошибка приходит пропсом.
 *
 * Один файл на четыре компонента — у них одна причина для изменения:
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
  /**
   * Подпись пустого значения — «Без степени», «Без звания». Не задана —
   * пустого значения у поля нет вовсе: тип записи новости обязателен
   * по контракту, и пункт «не выбрано» предлагал бы отправить форму
   * в состояние, которое сервер отклонит (F-43).
   */
  emptyLabel?: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <FieldShell id={id} label={label} error={error}>
      {/* Родной select: опций меньше десятка, поиск не нужен, а клавиатура,
          мобильные списки и диктор достаются бесплатно. */}
      <select id={id} className={inputClass} {...ariaProps(id, error)} {...registration}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
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

/**
 * Флажок: подпись справа от квадратика, а не сверху, — поэтому мимо
 * `FieldShell`. Каркас общих полей ставит подпись над содержимым, и флажок
 * в нём висел бы под своим текстом, оторванный от него.
 *
 * `hint` — строка под флажком, объясняющая последствие. У «Опубликовать»
 * она не украшение: снятый флажок означает черновик, которого на сайте
 * не видно, и это ровно то, чего от формы не ждут (docs/API.md, «Новости:
 * создание, правка, удаление»).
 */
export function CheckboxField({
  id,
  label,
  hint,
  error,
  registration,
}: FieldBaseProps & { hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
          {...ariaProps(id, error)}
          {...registration}
        />
        <label htmlFor={id} className="text-base font-bold text-text-heading">
          {label}
        </label>
      </div>

      {hint && <p className="text-sm text-text-muted">{hint}</p>}

      {error && (
        <p id={errorId(id)} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
