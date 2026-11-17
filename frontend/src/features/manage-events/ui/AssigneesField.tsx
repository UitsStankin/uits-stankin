import { accountName, errorId } from '@shared/lib';
import type { EventPerson, UserDirectoryEntry } from '@shared/types';

interface AssigneesFieldProps {
  /** Справочник учёток преподавателей (`GET /api/users/directory`). */
  accounts: readonly UserDirectoryEntry[];
  /** Назначенные, что уже стоят на событии, — с ФИО из самого события. */
  known: readonly EventPerson[];
  value: readonly number[];
  onChange: (ids: number[]) => void;
  isLoading: boolean;
  hasFailed: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * Кого назначить — флажки по справочнику учёток. Чистый.
 *
 * **Флажки, а не `<select multiple>`.** Родной множественный выбор
 * требует Ctrl-клика, на телефоне неудобен, и одно неловкое касание
 * снимает всех выбранных разом. Список преподавателей — десятки строк,
 * он умещается в прокручиваемую рамку.
 *
 * **Назначенный может быть вне справочника.** Справочник отдаёт только
 * действующих преподавателей, а снятая роль или блокировка с события
 * не снимают — как и связь карточки ППС (`AccountField`). Такие стоят
 * в начале списка с ФИО из самого события и пометкой, и уйдут обратно
 * в `PUT`, пока флажок не снят.
 *
 * Пока справочник едет или не доехал, список — только из уже
 * назначенных: снять их можно, назначить новых не из кого.
 */
export function AssigneesField({
  accounts,
  known,
  value,
  onChange,
  isLoading,
  hasFailed,
  error,
  disabled = false,
}: AssigneesFieldProps) {
  const id = 'event-assignees';
  const hasDirectory = !isLoading && !hasFailed;
  const inDirectory = new Set(accounts.map((account) => account.id));
  const outside = known.filter((person) => !inDirectory.has(person.id));
  const people = hasDirectory ? [...outside, ...accounts] : known;

  const toggle = (personId: number, checked: boolean) =>
    onChange(checked ? [...value, personId] : value.filter((item) => item !== personId));

  return (
    <fieldset
      className="flex flex-col gap-1.5"
      aria-invalid={error !== undefined}
      aria-describedby={error ? errorId(id) : undefined}
    >
      <legend className="mb-1.5 text-base font-bold text-text-heading">Назначить</legend>

      {isLoading && <p className="text-sm text-text-muted">Загружаем справочник…</p>}

      {hasFailed && (
        <p className="text-sm text-danger">
          Справочник не загрузился — назначить новых не из кого. Уже назначенных можно оставить или снять.
        </p>
      )}

      {hasDirectory && people.length === 0 && (
        <p className="text-sm text-text-muted">В справочнике нет ни одного преподавателя.</p>
      )}

      {people.length > 0 && (
        <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto rounded border border-gray-300 p-3">
          {people.map((person) => {
            const checkboxId = `${id}-${String(person.id)}`;
            const isOutside = hasDirectory && !inDirectory.has(person.id);

            return (
              <li key={person.id} className="flex items-center gap-2">
                <input
                  id={checkboxId}
                  type="checkbox"
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={value.includes(person.id)}
                  disabled={disabled}
                  onChange={(event) => toggle(person.id, event.target.checked)}
                />
                <label htmlFor={checkboxId} className="text-base text-text-default">
                  {accountName(person)}
                  {isOutside && <span className="text-text-muted"> — нет в справочнике</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-text-muted">
        {value.length === 0
          ? 'Никто не назначен — событие видит только тот, кто его создал.'
          : 'Назначенные видят событие у себя и могут его править и удалять.'}
      </p>

      {error && (
        <p id={errorId(id)} className="text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
