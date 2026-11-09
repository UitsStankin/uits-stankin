/**
 * Заглушка карточки. Показывается всегда, в том числе при переходе
 * из списка: списочная ручка отдаёт короткую карточку, и подсадить
 * из неё полную нечем (`model/useTeacherCard.ts`).
 *
 * Силуэт повторяет шапку карточки — круглое фото слева, три строки
 * справа, — чтобы страница не прыгала в момент ответа.
 */
export function TeacherProfileSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-gutter-sm">
      <span className="sr-only">Загрузка карточки преподавателя</span>

      <div
        aria-hidden
        className="flex animate-pulse flex-col items-center gap-6 rounded bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:p-8"
      >
        <div className="h-40 w-40 shrink-0 rounded-full bg-gray-200" />
        <div className="flex w-full flex-col gap-3">
          <div className="h-7 w-3/5 rounded bg-gray-200" />
          <div className="h-4 w-2/5 rounded bg-gray-200" />
          <div className="mt-3 h-3 w-1/3 rounded bg-gray-200" />
          <div className="h-3 w-1/4 rounded bg-gray-200" />
        </div>
      </div>

      <div aria-hidden className="animate-pulse rounded bg-white p-6 shadow-sm md:p-8">
        <div className="h-5 w-40 rounded bg-gray-200" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="h-3 w-full rounded bg-gray-200" />
          <div className="h-3 w-4/5 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
