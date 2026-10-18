/**
 * Серый силуэт карточки на время первой загрузки.
 *
 * Лежит рядом с `AchievementCard` по правилу, записанному
 * у `NewsCardSkeleton`: силуэт обязан повторять раскладку карточки —
 * обложка слева, строки справа, те же отступы, — иначе в момент ответа
 * список дёрнется по высоте, а замечать расхождение можно, только когда
 * они соседи.
 *
 * `aria-hidden`: диктору серые прямоугольники не говорят ничего —
 * загрузку проговаривает словами вызывающий. Пульсацию и число повторов
 * тоже задаёт он.
 */
export function AchievementCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-sm">
      <div className="aspect-[16/10] w-full shrink-0 rounded bg-skeleton" />
      <div className="flex flex-1 flex-col gap-3 py-1">
        <div className="h-3 w-52 rounded bg-skeleton" />
        <div className="h-5 w-3/4 rounded bg-skeleton" />
        <div className="h-3 w-full rounded bg-skeleton" />
        <div className="h-3 w-2/3 rounded bg-skeleton" />
      </div>
    </div>
  );
}
