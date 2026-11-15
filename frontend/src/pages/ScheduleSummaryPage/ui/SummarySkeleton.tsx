/**
 * Заглушка на время первой загрузки — два силуэта дня во всю ширину,
 * как настоящие дни, чтобы страница не прыгнула в момент ответа.
 */
export function SummarySkeleton() {
  return (
    <div role="status" className="flex animate-pulse flex-col gap-gutter-sm">
      <span className="sr-only">Загрузка сводного расписания</span>

      {[0, 1].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-4 rounded border border-gray-300 bg-white p-4 md:p-6"
        >
          <div className="h-6 w-1/3 rounded bg-gray-300" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <div key={card} className="h-20 rounded bg-gray-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
