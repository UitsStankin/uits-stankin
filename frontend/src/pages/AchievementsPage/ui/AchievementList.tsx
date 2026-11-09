import { AchievementCard } from '@entities/achievement';
import { cn } from '@shared/lib';
import type { Achievement } from '@shared/types';

interface AchievementListProps {
  achievements: readonly Achievement[];
  hrefForAchievement: (id: number) => string;
  /** Едет следующая страница: список притушен и не кликается. */
  isSwitching?: boolean;
}

/**
 * Список карточек. Чистый: получает готовый список и функцию адреса.
 *
 * Одна колонка, как у ленты новостей и конференций, и по той же причине:
 * заголовки и описания разной длины, и в сетке карточки в ряду
 * выравнивались бы по самой высокой. В оригинале здесь была сетка
 * плиток с градиентами — от неё осталась только мысль «достижения
 * показывают картинкой»: обложка у сущности обязательна, и в карточке
 * она стоит слева.
 */
export function AchievementList({
  achievements,
  hrefForAchievement,
  isSwitching = false,
}: AchievementListProps) {
  return (
    <ul
      className={cn(
        'flex flex-col gap-gutter-sm transition-opacity',
        // Клики блокируются вместе с притушиванием: без этого можно успеть
        // открыть карточку, которая уже уехала с экрана.
        isSwitching && 'pointer-events-none opacity-50',
      )}
      // Диктору сообщается, что список сейчас обновляется, — иначе он
      // прочитает старые заголовки как актуальные.
      aria-busy={isSwitching}
    >
      {achievements.map((achievement) => (
        <li key={achievement.id}>
          <AchievementCard
            achievement={achievement}
            href={hrefForAchievement(achievement.id)}
          />
        </li>
      ))}
    </ul>
  );
}
