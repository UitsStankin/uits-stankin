import { useMutation, useQueryClient } from '@tanstack/react-query';

import { helperKeys } from '@entities/helper';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { Helper } from '@shared/types';

import { deleteHelper } from '../api/helperAdminApi';

/**
 * Удаление карточки УВП.
 *
 * Отдельным хуком от формы: у удаления другая причина для изменения —
 * подтверждение и отказ, — а полей у него нет вовсе.
 *
 * Отказ показывается тостом, а не баннером в окне: окно подтверждения
 * к этому моменту закрывается, и держать его открытым ради строчки
 * с ошибкой означало бы предлагать нажать «Удалить» ещё раз — с тем же
 * результатом.
 */
export function useDeleteHelper(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (helper: Helper) => deleteHelper(helper.id),

    onSuccess: (_result, helper) => {
      void queryClient.invalidateQueries({ queryKey: helperKeys.all });

      toast.success(`Карточка «${helper.lastName} ${helper.firstName}» удалена`);
      onDeleted();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось удалить карточку. Попробуйте ещё раз.',
      );
      onDeleted();
    },
  });

  return {
    remove: (helper: Helper) => mutation.mutate(helper),
    isPending: mutation.isPending,
  };
}
