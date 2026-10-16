import { cn } from '@shared/lib';
import { FieldShell } from '@shared/ui/FormFields';
import type { UserDirectoryEntry } from '@shared/types';

interface AccountFieldProps {
  /** Учётки с ролью преподавателя из `GET /api/users/directory`. */
  accounts: readonly UserDirectoryEntry[];
  /** Выбранная учётка; `null` — карточка ни к кому не привязана. */
  value: number | null;
  onChange: (userId: number | null) => void;
  /** Справочник ещё едет: список пуст не потому, что учёток нет. */
  isLoading: boolean;
  /**
   * Что сказать под полем: сбой справочника либо отказ сервера по связи.
   * `null` — сообщения нет.
   */
  error: string | null;
  /**
   * Справочник не доехал — отдельным признаком, а не по наличию `error`:
   * от него зависит, заперт ли выбор, а место под сообщением может занять
   * отказ сохранения («Учётная запись уже связана с карточкой id=3»),
   * и тогда по тексту сбой справочника уже не отличить.
   */
  hasFailed: boolean;
}

/**
 * Связь карточки с учётной записью — выпадающий список учёток
 * преподавателей.
 *
 * Чистый: справочник, выбранное значение и состояние загрузки приходят
 * пропсами.
 *
 * **Мимо react-hook-form**, как и дисциплины рядом: обе сущности сверх
 * карточки живут в состоянии хука. Причина не в удобстве — отказ по этому
 * полю приходит без словаря `errors` (`InvalidRequestException` отвечает
 * одним `detail`), и подсветить поле всё равно нечем: сообщение уходит
 * в общий баннер. Регистрация в форме дала бы только видимость.
 *
 * Пустой пункт есть и назван словами: карточка без учётки — это штатно,
 * а не «не выбрано». Учётная запись есть не у каждого преподавателя,
 * и снять связь модератор должен уметь тем же списком, что и поставить.
 *
 * ФИО в справочнике может быть не заполнено вовсе — тогда подпись
 * собирается из `id`: пустой пункт списка выбрать можно, но понять,
 * что выбрал, нельзя.
 */
export function AccountField({
  accounts,
  value,
  onChange,
  isLoading,
  error,
  hasFailed,
}: AccountFieldProps) {
  const id = 'teacher-account';

  return (
    <FieldShell id={id} label="Учётная запись" error={error ?? undefined}>
      <select
        id={id}
        className={cn(
          'w-full rounded border border-gray-300 bg-white px-3 py-2',
          'text-base text-text-default transition-colors focus:border-primary focus:ring-0',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
        // Пока справочник едет или не доехал, выбирать не из чего — но и
        // «Без учётной записи» показывать нельзя: это выглядело бы как
        // ответ, хотя ответа нет.
        disabled={isLoading || hasFailed}
        value={value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      >
        {/* Подпись пустого пункта объясняет запертый выбор сама: место
            под полем может занять отказ сохранения, и «почему не нажимается»
            осталось бы без ответа. */}
        <option value="">{emptyLabel(isLoading, hasFailed)}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {accountLabel(account)}
          </option>
        ))}
      </select>

      <p className="text-sm text-text-muted">
        По этой связи преподаватель открывает свою карточку в личном кабинете. Одна учётная запись —
        одна карточка: занятую сервер не отдаст.
      </p>
    </FieldShell>
  );
}

function emptyLabel(isLoading: boolean, hasFailed: boolean): string {
  if (isLoading) return 'Загружаем справочник…';
  if (hasFailed) return 'Справочник не доехал';

  return 'Без учётной записи';
}

/** «Фамилия Имя», а без них — хотя бы номер учётки. */
function accountLabel(account: UserDirectoryEntry): string {
  const name = [account.lastName, account.firstName].filter(Boolean).join(' ');

  return name === '' ? `Учётная запись № ${account.id}` : name;
}
