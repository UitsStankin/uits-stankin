interface DataTableSkeletonProps {
  /** Сколько колонок рисовать полосками — столько же, сколько у таблицы. */
  columnCount: number;
  /** Что проговорит диктор: «Загрузка списка дисциплин». */
  label: string;
}

/**
 * Заглушка таблицы на время первой загрузки. Чистая: и число колонок,
 * и подпись приходят пропсами.
 *
 * Скелет, а не «Загрузка…»: он занимает примерно столько же места,
 * сколько займут строки, и страница не прыгает в момент ответа. Восемь
 * строк — меньше страницы контракта (двадцать) намеренно: скелет на весь
 * экран обещает больше, чем может оказаться в разделе, где записей пять.
 *
 * Одна на все таблицы админки, в отличие от публичной части, где скелет
 * писался под каждый список свой: там полоски повторяют колонки конкретной
 * таблицы, здесь колонки задаются конфигом, и подгонять под них ширины
 * значило бы держать конфиг в двух местах.
 */
export function DataTableSkeleton({ columnCount, label }: DataTableSkeletonProps) {
  return (
    <div role="status" className="animate-pulse rounded bg-white p-4 shadow-sm md:p-6">
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">{label}</span>

      <div aria-hidden className="flex flex-col gap-5">
        <SkeletonRow columnCount={columnCount} />

        <div className="flex flex-col gap-5 border-t border-default pt-5">
          {Array.from({ length: 8 }, (_, row) => (
            <SkeletonRow key={row} columnCount={columnCount} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: columnCount }, (_, column) => (
        <div
          key={column}
          // Первая колонка узкая, последняя — под кнопки строки, между
          // ними тянется содержимое: так полоски примерно совпадают
          // с тем, что появится на их месте.
          className={
            column === 0
              ? 'h-3 w-40 shrink-0 rounded bg-gray-200'
              : column === columnCount - 1
                ? 'h-3 w-20 shrink-0 rounded bg-gray-200'
                : 'h-3 flex-1 rounded bg-gray-200'
          }
        />
      ))}
    </div>
  );
}
