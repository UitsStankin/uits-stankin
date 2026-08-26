/**
 * Место под меню профиля на время, пока едет ответ о профиле.
 *
 * Нужен, чтобы шапка не мигала: без него между «токен есть» и «профиль
 * пришёл» на месте меню оказывалась бы ссылка «Вход для персонала» —
 * то есть уже вошедшему пользователю на долю секунды предлагали бы войти.
 */
export function SessionSkeleton() {
  return (
    <div className="flex items-center gap-2 p-1" aria-hidden>
      <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
      <div className="hidden h-3 w-24 animate-pulse rounded bg-gray-200 sm:block" />
    </div>
  );
}
