import { useMutation, useQueryClient } from '@tanstack/react-query';

import { postgraduateKeys } from '@entities/postgraduate';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { Postgraduate } from '@shared/types';

import { deletePostgraduate } from '../api/postgraduateAdminApi';

/**
 * Удаление записи аспирантуры — вместе со студентом.
 *
 * Отказ — тостом, а не баннером в окне, по той же причине, что в других
 * разделах: окно подтверждения к этому моменту закрывается, и держать
 * его открытым ради строчки с ошибкой означало бы предлагать нажать
 * «Удалить» ещё раз — с тем же результатом.
 */
export function useDeletePostgraduate(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (postgraduate: Postgraduate) => deletePostgraduate(postgraduate.id),

    onSuccess: (_result, postgraduate) => {
      void queryClient.invalidateQueries({ queryKey: postgraduateKeys.all });

      toast.success(`Запись «${postgraduate.studentName}» удалена`);
      onDeleted();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось удалить запись. Попробуйте ещё раз.',
      );
      onDeleted();
    },
  });

  return {
    remove: (postgraduate: Postgraduate) => mutation.mutate(postgraduate),
    isPending: mutation.isPending,
  };
}
