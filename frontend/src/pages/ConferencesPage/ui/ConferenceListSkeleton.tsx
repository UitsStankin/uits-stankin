import { ConferenceCardSkeleton } from '@entities/conference';

/**
 * Заглушка на время первой загрузки.
 *
 * Скелет, а не «Загрузка...»: он занимает столько же места, сколько займут
 * карточки, и страница не прыгает в момент ответа. Три силуэта, а не двадцать
 * (размер страницы по контракту), — до первого экрана всё равно видно три.
 */
export function ConferenceListSkeleton() {
  return (
    <div role="status" className="grid animate-pulse grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">Загрузка объявлений о конференциях</span>

      {[0, 1, 2, 3, 4, 5].map((index) => (
        <ConferenceCardSkeleton key={index} />
      ))}
    </div>
  );
}
