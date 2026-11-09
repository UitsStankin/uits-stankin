import { useMutation, useQueryClient } from '@tanstack/react-query';

import { conferenceKeys } from '@entities/conference';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { Conference } from '@shared/types';

import { deleteConference } from '../api/conferenceAdminApi';

/**
 * Удаление объявления о конференции.
 *
 * Отдельным хуком от формы и с отказом тостом — по тем же причинам,
 * что у новостей (`features/manage-news/model/useDeleteNews.ts`): полей
 * у удаления нет, а окно подтверждения к моменту ответа уже закрывается.
 *
 * Кэш сбрасывается целиком (`conferenceKeys.all`): удалённое объявление
 * исчезает и из админского списка, и из публичного, и со своей страницы,
 * где после удаления его ждёт `404`.
 */
export function useDeleteConference(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (conference: Conference) => deleteConference(conference.id),

    onSuccess: (_result, conference) => {
      void queryClient.invalidateQueries({ queryKey: conferenceKeys.all });

      toast.success(`Конференция «${conference.title}» удалена`);
      onDeleted();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось удалить конференцию. Попробуйте ещё раз.',
      );
      onDeleted();
    },
  });

  return {
    remove: (conference: Conference) => mutation.mutate(conference),
    isPending: mutation.isPending,
  };
}
