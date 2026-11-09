import { useMutation, useQueryClient } from '@tanstack/react-query';

import { achievementKeys } from '@entities/achievement';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { Achievement } from '@shared/types';

import { deleteAchievement } from '../api/achievementAdminApi';

/**
 * Удаление достижения — отдельным хуком от формы и с отказом тостом,
 * как у новостей и конференций.
 *
 * Кэш сбрасывается целиком (`achievementKeys.all`): удалённое достижение
 * исчезает из админского списка, из раздела на сайте, со своей страницы
 * и из блока на карточке преподавателя.
 */
export function useDeleteAchievement(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (achievement: Achievement) => deleteAchievement(achievement.id),

    onSuccess: (_result, achievement) => {
      void queryClient.invalidateQueries({ queryKey: achievementKeys.all });

      toast.success(`Достижение «${achievement.title}» удалено`);
      onDeleted();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось удалить достижение. Попробуйте ещё раз.',
      );
      onDeleted();
    },
  });

  return {
    remove: (achievement: Achievement) => mutation.mutate(achievement),
    isPending: mutation.isPending,
  };
}
