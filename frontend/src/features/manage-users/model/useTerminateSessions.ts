import { useMutation } from '@tanstack/react-query';

import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { AdminUser } from '@shared/types';

import { terminateSessions } from '../api/userAdminApi';

/**
 * Завершение всех сессий учётки. Полей нет — только подтверждение,
 * поэтому отказ тостом, как у удаления в остальных разделах: окно
 * подтверждения к моменту ответа закрывается.
 *
 * Кэш не трогается: в списке от этого не меняется ничего.
 */
export function useTerminateSessions(onDone: () => void) {
  const mutation = useMutation({
    mutationFn: (user: AdminUser) => terminateSessions(user.id),

    onSuccess: (_result, user) => {
      toast.success(`Сессии учётной записи «${user.username}» завершены`);
      onDone();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось завершить сессии. Попробуйте ещё раз.',
      );
      onDone();
    },
  });

  return {
    terminate: (user: AdminUser) => mutation.mutate(user),
    isPending: mutation.isPending,
  };
}
