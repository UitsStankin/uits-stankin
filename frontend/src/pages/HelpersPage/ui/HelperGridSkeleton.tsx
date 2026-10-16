import { HelperCardSkeleton } from '@entities/helper';

/**
 * Заглушка на время первой загрузки.
 *
 * Скелет, а не «Загрузка...»: он занимает столько же места, сколько
 * займут карточки, и страница не прыгает в момент ответа. Шесть
 * силуэтов — два ряда по три на широком экране, как у ППС.
 *
 * Раскладка повторяет `HelperGrid` вплоть до брейкпоинтов — иначе
 * в момент ответа сетка перестроится и страница дёрнется.
 */
export function HelperGridSkeleton() {
  return (
    <div
      role="status"
      className="grid animate-pulse grid-cols-1 gap-gutter-sm sm:grid-cols-2 lg:grid-cols-3"
    >
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">Загрузка списка сотрудников</span>

      {[0, 1, 2, 3, 4, 5].map((index) => (
        <HelperCardSkeleton key={index} />
      ))}
    </div>
  );
}
