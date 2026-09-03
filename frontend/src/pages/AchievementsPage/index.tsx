import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useAchievementList } from './model/useAchievementList';
import { AchievementList } from './ui/AchievementList';
import { AchievementListSkeleton } from './ui/AchievementListSkeleton';

/**
 * Достижения кафедры. Сборка: состояние берётся из модели, разметка —
 * из чистых компонентов.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/achievements` открыта всем.
 *
 * Сетки цифр из оригинала («142 научных публикации», «28 международных
 * наград», «15 патентов», «95% трудоустройство») здесь нет намеренно:
 * числа были захардкожены в разметке старого портала, источника у них
 * нет и подтвердить их некому — тот же случай, что с плиткой цифр
 * на главной (F-17). Появятся они не вёрсткой, а данными: подтверждённые
 * заказчиком числа — это содержимое редактируемого раздела, а не константы
 * в коде фронта.
 */
export default function AchievementsPage() {
  const {
    achievements,
    page,
    totalPages,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    hrefForAchievement,
  } = useAchievementList();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Достижения кафедры</h1>

      {isLoading && <AchievementListSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить достижения"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Достижений пока нет"
          description="Как только кафедре будет чем поделиться, это будет здесь."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустой список без объяснения выглядел бы
          так, будто достижения кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {achievements.length > 0 && (
        <>
          <AchievementList
            achievements={achievements}
            hrefForAchievement={hrefForAchievement}
            isSwitching={isSwitching}
          />
          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}
    </div>
  );
}
