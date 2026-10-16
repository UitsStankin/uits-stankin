/**
 * Заглушка таблицы на время первой загрузки.
 *
 * Скелет, а не «Загрузка...»: он занимает примерно столько же места,
 * сколько займут строки, и страница не прыгает в момент ответа. Восемь
 * строк — меньше страницы контракта (двадцать), и это намеренно: скелет
 * на весь экран обещает больше, чем может оказаться в разделе, где
 * аспирантов пятеро.
 *
 * Ширины полосок повторяют колонки, но не держат `min-w` таблицы: узкие
 * колонки на телефоне просто убраны. Прокручивать заглушку вбок некому
 * и незачем — читать в ней нечего.
 */
export function PostgraduateTableSkeleton() {
  return (
    <div
      role="status"
      className="animate-pulse rounded bg-white p-4 shadow-sm md:p-6"
    >
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">Загрузка списка аспирантов</span>

      <div aria-hidden className="flex flex-col gap-5">
        <SkeletonRow />

        <div className="flex flex-col gap-5 border-t border-default pt-5">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
            <SkeletonRow key={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 w-6 shrink-0 rounded bg-gray-200" />
      <div className="h-3 w-32 shrink-0 rounded bg-gray-200 sm:w-40" />
      <div className="h-3 flex-1 rounded bg-gray-200" />
      <div className="hidden h-3 w-16 shrink-0 rounded bg-gray-200 md:block" />
      <div className="hidden h-3 w-10 shrink-0 rounded bg-gray-200 md:block" />
      <div className="hidden h-3 w-32 shrink-0 rounded bg-gray-200 lg:block" />
    </div>
  );
}
