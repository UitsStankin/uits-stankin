import { cn } from '@shared/lib';
import { FieldShell } from '@shared/ui/FormFields';
import type { Subject } from '@shared/types';

interface SubjectsFieldProps {
  /** Словарь целиком — `GET /api/subjects`. */
  subjects: readonly Subject[];
  /** Отмеченные дисциплины. */
  value: readonly number[];
  onToggle: (id: number) => void;
  /** Словарь ещё едет: пусто не значит «дисциплин нет». */
  isLoading: boolean;
  /** Словарь не доехал вовсе. `null` — доехал. */
  error: string | null;
}

/**
 * Дисциплины преподавателя — флажки по словарю.
 *
 * Чистый: словарь, отмеченное и состояние загрузки приходят пропсами.
 *
 * **Флажки, а не множественный `<select>`**: родной `multiple` требует
 * держать Ctrl, чтобы не потерять уже выбранное, и на этом теряют выбор
 * все, кто про Ctrl не знает. Дисциплин у кафедры десятки, не сотни —
 * список помещается в прокручиваемую рамку целиком, и видно сразу, что
 * отмечено, а что нет.
 *
 * **Мимо react-hook-form**, как и учётная запись рядом: набор отмеченных
 * — не поле ввода, а `fieldset`, и отказ по нему приходит без словаря
 * `errors`. То же решение, что у ключа фото, который тоже живёт
 * в состоянии хука, а не в форме.
 *
 * `fieldset` с `legend` — не украшение: без них диктор читает двадцать
 * флажков подряд, не сказав, к чему они относятся. Подпись группы рисует
 * общий каркас поля, поэтому `legend` спрятан от глаз, но не от диктора.
 */
export function SubjectsField({
  subjects,
  value,
  onToggle,
  isLoading,
  error,
}: SubjectsFieldProps) {
  const id = 'teacher-subjects';

  return (
    <FieldShell id={id} label="Дисциплины" error={error ?? undefined} labelAsText>
      {isLoading && <p className="text-base text-text-muted">Загружаем словарь дисциплин…</p>}

      {/* Словарь пуст — это не сбой формы, а состояние кафедры: дисциплины
          заводятся своим разделом админки, и отправлять туда полезнее,
          чем показывать пустую рамку. */}
      {!isLoading && error === null && subjects.length === 0 && (
        <p className="text-base text-text-muted">
          Словарь дисциплин пуст. Заполните его в разделе «Дисциплины» — здесь появятся флажки.
        </p>
      )}

      {subjects.length > 0 && (
        <fieldset
          className={cn(
            'max-h-64 overflow-y-auto rounded border border-default p-3',
            'flex flex-col gap-2',
          )}
        >
          <legend className="sr-only">Дисциплины преподавателя</legend>

          {subjects.map((subject) => (
            <label key={subject.id} className="flex items-center gap-2 text-base">
              <input
                type="checkbox"
                className="size-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary"
                checked={value.includes(subject.id)}
                onChange={() => onToggle(subject.id)}
              />
              {subject.name}
            </label>
          ))}
        </fieldset>
      )}
    </FieldShell>
  );
}
