import { AchievementCardSkeleton } from '@entities/achievement';

/**
 * Заглушка на время первой загрузки.
 *
 * Скелет, а не «Загрузка...»: он занимает столько же места, сколько займут
 * карточки, и страница не прыгает в момент ответа. Три силуэта, а не двадцать
 * (размер страницы по контракту), — до первого экрана всё равно видно три.
 */
export function AchievementListSkeleton() {
  return (
    <div role="status" className="flex animate-pulse flex-col gap-gutter-sm">
      {/* Серые прямоугольники диктору ничего не говорят — для него
          загрузка проговаривается словами. */}
      <span className="sr-only">Загрузка достижений кафедры</span>

      {[0, 1, 2].map((index) => (
        <AchievementCardSkeleton key={index} />
      ))}
    </div>
  );
}
