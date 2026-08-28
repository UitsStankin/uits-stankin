/**
 * Заглушка на время первой загрузки.
 *
 * Скелет, а не «Загрузка...»: он занимает столько же места, сколько займут
 * карточки, и страница не прыгает в момент ответа. Три карточки, а не двадцать
 * (размер страницы по контракту), — до первого экрана всё равно видно три,
 * а рисовать невидимое незачем.
 */
export function NewsListSkeleton() {
  return (
    <div role="status" className="flex animate-pulse flex-col gap-gutter-sm">
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">Загрузка новостей</span>

      {[0, 1, 2].map((index) => (
        <div key={index} aria-hidden className="flex flex-col gap-4 rounded bg-white p-5 shadow-sm sm:flex-row">
          <div className="h-32 w-full shrink-0 rounded bg-gray-200 sm:w-56" />
          <div className="flex flex-1 flex-col gap-3 py-1">
            <div className="h-3 w-40 rounded bg-gray-200" />
            <div className="h-5 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-full rounded bg-gray-200" />
            <div className="h-3 w-5/6 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
