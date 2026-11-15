interface GroupSelectProps {
  value: string;
  groups: readonly string[];
  onChange: (group: string) => void;
}

/**
 * Выбор группы. Чистый: список и значение приходят пропсами.
 *
 * Родной `select`, а не ссылки-фильтры, как в админке: групп — десятки,
 * и ряд из них занял бы полэкрана. Мобильный список, клавиатура и диктор
 * у родного достаются бесплатно; поиск по первым буквам в нём тоже есть.
 */
export function GroupSelect({ value, groups, onChange }: GroupSelectProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor="exam-group" className="text-base font-bold text-text-heading">
        Группа
      </label>
      <select
        id="exam-group"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-text-default sm:w-64"
      >
        <option value="">Все группы</option>
        {groups.map((group) => (
          <option key={group} value={group}>
            {group}
          </option>
        ))}
      </select>
    </div>
  );
}
