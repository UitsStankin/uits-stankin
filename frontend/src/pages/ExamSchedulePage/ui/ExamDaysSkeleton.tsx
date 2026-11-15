/**
 * Заглушка на время первой загрузки — три силуэта дня в той же сетке,
 * что и настоящие дни, чтобы страница не прыгнула в момент ответа.
 */
export function ExamDaysSkeleton() {
  return (
    <div
      role="status"
      className="grid animate-pulse grid-cols-1 gap-gutter-sm sm:grid-cols-2 lg:grid-cols-3"
    >
      <span className="sr-only">Загрузка расписания экзаменов</span>

      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded border border-gray-300 bg-white p-4"
        >
          <div className="h-5 w-2/3 rounded bg-gray-300" />
          <div className="h-4 w-1/3 rounded bg-gray-300" />
          <div className="h-4 w-full rounded bg-gray-300" />
          <div className="h-4 w-1/2 rounded bg-gray-300" />
        </div>
      ))}
    </div>
  );
}
