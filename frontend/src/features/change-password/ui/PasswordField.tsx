import { Eye, EyeOff } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { cn } from '@shared/lib';

interface PasswordFieldProps {
  id: string;
  label: string;
  /**
   * Подсказка менеджеру паролей: какой из трёх ввод. С одинаковым
   * `current-password` на всех полях он предложил бы подставить старый
   * пароль в новый.
   */
  autoComplete: 'current-password' | 'new-password';
  /** Текст ошибки под полем; `undefined` — ошибки нет. */
  error?: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  /** Результат `register(...)` из react-hook-form. */
  registration: UseFormRegisterReturn;
}

const inputClass = cn(
  'w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10',
  'text-base text-text-default placeholder:text-text-muted',
  'transition-colors focus:border-primary focus:ring-0',
  'aria-invalid:border-danger',
);

/**
 * Поле ввода пароля с кнопкой «показать». Чистое: видимость приходит
 * пропсом, а не хранится внутри, — иначе компонент нельзя отрендерить
 * в открытом виде для проверки.
 *
 * Живёт в фиче, а не в `shared/ui`: у формы входа сегодня своя такая же
 * разметка, и сводить их в общий примитив стоит, когда появится третий
 * потребитель, — то есть вместе с формами админки (F-40). Раньше это
 * означало бы придумывать общий интерфейс по двум случаям.
 */
export function PasswordField({
  id,
  label,
  autoComplete,
  error,
  isVisible,
  onToggleVisibility,
  registration,
}: PasswordFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-base font-bold text-text-heading">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          aria-invalid={error !== undefined}
          aria-describedby={error && errorId}
          className={inputClass}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          // Кнопка внутри формы: без type="button" она отправляла бы форму.
          aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={isVisible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-text-muted transition-colors hover:text-primary"
        >
          {isVisible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      </div>

      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
