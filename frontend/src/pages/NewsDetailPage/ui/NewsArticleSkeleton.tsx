/**
 * Заглушка статьи. Показывается только при заходе по прямой ссылке:
 * при переходе из ленты запись уже лежит в кэше и рисуется сразу
 * (`model/useNewsItem.ts`).
 */
export function NewsArticleSkeleton() {
  return (
    <div role="status" className="animate-pulse rounded bg-white p-6 shadow-sm md:p-8">
      <span className="sr-only">Загрузка новости</span>

      <div aria-hidden className="flex flex-col gap-4">
        <div className="h-3 w-48 rounded bg-gray-200" />
        <div className="h-7 w-4/5 rounded bg-gray-200" />
        <div className="mt-4 h-64 w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}
