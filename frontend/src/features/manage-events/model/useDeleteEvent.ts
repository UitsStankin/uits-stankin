import { useMutation, useQueryClient } from '@tanstack/react-query';

import { eventKeys } from '@entities/event';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { UserEvent } from '@shared/types';

import { deleteEvent } from '../api/eventAdminApi';

/**
 * Удаление события. Отдельно от формы и с отказом тостом — как
 * у конференций (`useDeleteConference`): полей у удаления нет, а окно
 * подтверждения к ответу уже закрывается.
 *
 * `onSettled` зовётся и после успеха, и после отказа: окно подтверждения
 * закрывается в обоих случаях. Успех страница узнаёт по `onDeleted`,
 * чтобы закрыть и карточку удалённого события, — иначе она повисела бы
 * до прихода свежей выдачи.
 */
export function useDeleteEvent({
  onDeleted,
  onSettled,
}: {
  onDeleted: () => void;
  onSettled: () => void;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (event: UserEvent) => deleteEvent(event.id),

    onSuccess: (_result, event) => {
      toast.success(`Событие «${event.name}» удалено`);
      onDeleted();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось удалить событие. Попробуйте ещё раз.',
      );
    },

    // Выдача перечитывается и после отказа: `404` значит, что события
    // уже нет (удалил назначенный или сняли с него), и в сетке оно
    // висеть не должно.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.all });
      onSettled();
    },
  });

  return {
    remove: (event: UserEvent) => mutation.mutate(event),
    isPending: mutation.isPending,
  };
}
