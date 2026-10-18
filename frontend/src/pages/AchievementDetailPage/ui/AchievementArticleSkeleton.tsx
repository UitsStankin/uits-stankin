/**
 * Заглушка достижения. Показывается только при заходе по прямой ссылке:
 * при переходе из списка — и раздела, и блока на карточке ППС — запись
 * уже лежит в кэше и рисуется сразу (`model/useAchievementItem.ts`).
 */
export function AchievementArticleSkeleton() {
  return (
    <div role="status" className="animate-pulse rounded bg-surface p-6 shadow-sm md:p-8">
      <span className="sr-only">Загрузка достижения</span>

      <div aria-hidden className="flex flex-col gap-4">
        <div className="h-3 w-52 rounded bg-skeleton" />
        <div className="h-7 w-4/5 rounded bg-skeleton" />
        <div className="h-4 w-2/3 rounded bg-skeleton" />
        {/* Силуэт обложки — она у достижения обязательна, и без него
            страница прыгнула бы на всю её высоту. */}
        <div className="mt-2 h-56 w-full rounded bg-skeleton" />
        <div className="h-3 w-full rounded bg-skeleton" />
        <div className="h-3 w-2/3 rounded bg-skeleton" />
      </div>
    </div>
  );
}
