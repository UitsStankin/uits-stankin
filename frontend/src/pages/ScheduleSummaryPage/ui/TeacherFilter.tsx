import { X } from "lucide-react";

import type { SummaryTeacher } from "@entities/schedule";

interface TeacherFilterProps {
  teachers: readonly SummaryTeacher[];
  selected: readonly SummaryTeacher[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onlyWithCabinet: boolean;
  onOnlyWithCabinetChange: (value: boolean) => void;
}

/**
 * Отбор: преподаватели и «только с аудиторией». Чистый — список, выбор
 * и обработчики приходят пропсами.
 *
 * Выбор нескольких — родной `select` «добавить» и плашки выбранных
 * с крестиком, а не `select multiple`: родной множественный выбор
 * на компьютере требует Ctrl-клика, о котором никто не знает, и один
 * простой клик сбрасывает всё выбранное. Здесь каждое действие —
 * одно нажатие, клавиатура и диктор у родного `select` бесплатно,
 * поиск по первым буквам фамилии в нём тоже есть.
 */
export function TeacherFilter({
  teachers,
  selected,
  onAdd,
  onRemove,
  onClear,
  onlyWithCabinet,
  onOnlyWithCabinetChange,
}: TeacherFilterProps) {
  const available = teachers.filter(
    (teacher) => !selected.some((chosen) => chosen.id === teacher.id),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <label
          htmlFor="summary-teacher"
          className="text-base font-bold text-text-heading"
        >
          Преподаватели
        </label>
        <select
          id="summary-teacher"
          // Пустое значение всегда: `select` здесь — кнопка «добавить»,
          // а не поле с текущим значением; выбранные стоят плашками ниже.
          value=""
          onChange={(event) => {
            if (event.target.value !== "") onAdd(Number(event.target.value));
          }}
          disabled={available.length === 0}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-text-default sm:w-80"
        >
          <option value="">
            {selected.length === 0
              ? "Все — выберите, чтобы отобрать"
              : "Добавить преподавателя"}
          </option>
          {available.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-base text-text-default sm:ml-4">
          <input
            type="checkbox"
            checked={onlyWithCabinet}
            onChange={(event) => {
              onOnlyWithCabinetChange(event.target.checked);
            }}
            className="size-4 accent-primary"
          />
          Только с аудиторией
        </label>
      </div>

      {selected.length > 0 && (
        <ul
          aria-label="Выбранные преподаватели"
          className="flex flex-wrap items-center gap-2"
        >
          {selected.map((teacher) => (
            <li
              key={teacher.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary bg-white py-1 pr-1 pl-3 text-sm text-text-default"
            >
              {teacher.name}
              <button
                type="button"
                onClick={() => {
                  onRemove(teacher.id);
                }}
                aria-label={`Убрать: ${teacher.name}`}
                className="rounded-full p-0.5 text-text-muted transition-colors hover:text-primary"
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={onClear}
              className="text-sm font-bold text-primary hover:underline"
            >
              Показать всех
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
