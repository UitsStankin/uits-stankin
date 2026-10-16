/**
 * Заглушка объявления. Показывается только при заходе по прямой ссылке:
 * при переходе из списка запись уже лежит в кэше и рисуется сразу
 * (`model/useConferenceItem.ts`).
 */
export function ConferenceArticleSkeleton() {
  return (
    <div role="status" className="animate-pulse rounded bg-white p-6 shadow-sm md:p-8">
      <span className="sr-only">Загрузка объявления</span>

      <div aria-hidden className="flex flex-col gap-4">
        <div className="h-3 w-48 rounded bg-gray-200" />
        <div className="h-7 w-4/5 rounded bg-gray-200" />
        {/* Силуэт блока фактов — чтобы страница не прыгала, когда он приедет. */}
        <div className="mt-2 h-32 w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-2/3 rounded bg-gray-200" />
      </div>
    </div>
  );
}
