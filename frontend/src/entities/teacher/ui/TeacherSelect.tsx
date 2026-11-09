import { cn, errorId, hintId } from '@shared/lib';
import { FieldShell } from '@shared/ui/FormFields';
import type { TeacherListItem } from '@shared/types';

import { teacherFullName } from '../lib/teacherPresenters';

interface TeacherSelectProps {
  id: string;
  label: string;
  /** Подпись пустого выбора: «Кафедральное, без преподавателя», «Не назначен». */
  noneLabel: string;
  /** Что значит пустой выбор для этой записи — строка под списком. */
  hint: string;
  /** Карточки ППС из списочной ручки — короткая проекция, ФИО там есть. */
  teachers: readonly TeacherListItem[];
  /** Выбранная карточка; `null` — не выбрано. */
  value: number | null;
  onChange: (teacherId: number | null) => void;
  /**
   * Имя привязанного преподавателя из самой записи (`teacherName`).
   * Нужно, когда карточки в загруженном списке нет, — иначе выбор показал
   * бы чужой пункт при живой ссылке.
   */
  currentName: string | null;
  /** Список ещё едет: вариантов нет не потому, что преподавателей нет. */
  isLoading: boolean;
  /** Список не доехал: выбор заперт, текущее значение при этом не теряется. */
  hasFailed: boolean;
  /** Отказ сервера по полю либо сбой списка; `undefined` — сообщения нет. */
  error?: string;
}

/**
 * Привязка записи к преподавателю — выпадающий список карточек ППС.
 *
 * Заведён в форме достижения (F-45) и переехал в сущность со вторым
 * потребителем — научным руководителем в записи аспирантуры (F-47).
 * В `entities`, а не в `shared/ui`: список знает, как называть
 * преподавателя (`teacherFullName`), а это предметная область.
 *
 * Чистый: список, значение и состояние загрузки приходят пропсами.
 * Управляемый, а не через `register`, и это главное в нём: варианты
 * приезжают позже формы, и только управляемый `<select>` покажет
 * сохранённого преподавателя, когда его пункт наконец появится.
 *
 * Пока список едет или не доехал, выбор заперт — как у связи карточки ППС
 * с учётной записью (`features/manage-teachers/ui/AccountField`). Пункт
 * «без преподавателя» в это время показывать нельзя: он выглядел бы как
 * ответ, хотя ответа нет, — поэтому пустой пункт объясняет себя сам.
 *
 * Если привязанной карточки в списке нет (преподавателей больше сотни,
 * потолка контракта), её пункт добавляется из имени, пришедшего
 * с записью: без него браузер выбрал бы первый вариант, и на экране
 * стояло бы «без преподавателя» при живой ссылке.
 */
export function TeacherSelect({
  id,
  label,
  noneLabel,
  hint,
  teachers,
  value,
  onChange,
  currentName,
  isLoading,
  hasFailed,
  error,
}: TeacherSelectProps) {
  const isMissing =
    value !== null && !isLoading && !teachers.some((teacher) => teacher.id === value);

  // Объяснение и ошибку диктор услышит только через `aria-describedby`.
  const describedBy = [hintId(id), error && errorId(id)].filter(Boolean).join(' ');

  return (
    <FieldShell id={id} label={label} error={error}>
      <select
        id={id}
        className={cn(
          'w-full rounded border border-gray-300 bg-white px-3 py-2',
          'text-base text-text-default transition-colors focus:border-primary focus:ring-0',
          'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-60',
        )}
        disabled={isLoading || hasFailed}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy}
        value={value === null ? '' : String(value)}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      >
        <option value="">{emptyLabel(isLoading, hasFailed, noneLabel)}</option>
        {isMissing && <option value={value}>{currentName ?? `Карточка № ${value}`}</option>}
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacherFullName(teacher)}
          </option>
        ))}
      </select>

      <p id={hintId(id)} className="text-sm text-text-muted">
        {hint}
      </p>
    </FieldShell>
  );
}

function emptyLabel(isLoading: boolean, hasFailed: boolean, noneLabel: string): string {
  if (isLoading) return 'Загружаем преподавателей…';
  if (hasFailed) return 'Список преподавателей не доехал';

  return noneLabel;
}
