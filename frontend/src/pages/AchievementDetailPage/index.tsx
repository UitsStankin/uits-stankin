import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

import { ACHIEVEMENTS_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useAchievementItem } from './model/useAchievementItem';
import { AchievementArticle } from './ui/AchievementArticle';
import { AchievementArticleSkeleton } from './ui/AchievementArticleSkeleton';

/**
 * Одно достижение кафедры. Сборка: состояние из модели, разметка
 * из чистых компонентов.
 *
 * Ссылка «ко всем» ведёт на первую страницу раздела, а не «назад»
 * по истории: на страницу попадают и из поиска, и по присланному адресу,
 * и `history.back()` увёл бы такого посетителя с портала совсем.
 * Сюда же приходят с карточки ППС, и ссылка одна на оба случая: своего
 * адреса у достижений преподавателя нет — блок на его карточке ведёт
 * в общий раздел.
 */
export default function AchievementDetailPage() {
  const { achievement, isLoading, isOffline, isNotFound, isError, errorMessage, refetch } =
    useAchievementItem();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter-sm">
      <Link
        to={ACHIEVEMENTS_ROUTE}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />
        Ко всем достижениям
      </Link>

      {isLoading && <AchievementArticleSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isNotFound && (
        <StatusBlock
          title="Достижение не найдено"
          // Скрытое и несуществующее достижения неразличимы по контракту —
          // и текст не должен подсказывать, что именно из двух случилось.
          description="Возможно, его удалили или сняли с публикации, а ссылка осталась."
          action={<ActionLink to={ACHIEVEMENTS_ROUTE}>К достижениям кафедры</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить достижение"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {achievement && <AchievementArticle achievement={achievement} />}
    </div>
  );
}
