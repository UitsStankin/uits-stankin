/**
 * Серый силуэт карточки ППС на время первой загрузки.
 *
 * Лежит рядом с `TeacherCard` по той же причине, что силуэт новости рядом
 * со своей карточкой: он обязан повторять её раскладку — круг сверху,
 * две строки под ним, те же отступы, — иначе в момент ответа сетка
 * дёрнется по высоте.
 *
 * `aria-hidden`: диктору серые прямоугольники не говорят ничего, для него
 * загрузка проговаривается словами — это делает вызывающий.
 */
export function TeacherCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full flex-col items-center gap-3 rounded bg-surface p-5 shadow-sm"
    >
      <div className="h-28 w-28 shrink-0 rounded-full bg-skeleton" />
      <div className="h-5 w-3/4 rounded bg-skeleton" />
      <div className="h-3 w-5/6 rounded bg-skeleton" />
    </div>
  );
}
