import { useMutation, useQueryClient } from '@tanstack/react-query';

import { subjectKeys } from '@entities/subject';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { Subject } from '@shared/types';

import { deleteSubject } from '../api/subjectAdminApi';

/**
 * Удаление дисциплины.
 *
 * Отдельным хуком от формы: у удаления другая причина для изменения —
 * подтверждение и отказ «дисциплина кому-то назначена», а полей у него
 * нет вовсе.
 *
 * Отказ показывается тостом, а не баннером в окне: окно подтверждения
 * к этому моменту закрывается, и держать его открытым ради строчки
 * с ошибкой означало бы предлагать нажать «Удалить» ещё раз — с тем же
 * результатом. Текст `409` приходит с сервера готовым и объясняет, что
 * делать: «Дисциплина назначена преподавателям (3), сначала снять её
 * с карточек».
 */
export function useDeleteSubject(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (subject: Subject) => deleteSubject(subject.id),

    onSuccess: (_result, subject) => {
      void queryClient.invalidateQueries({ queryKey: subjectKeys.lists() });

      toast.success(`Дисциплина «${subject.name}» удалена`);
      onDeleted();
    },

    onError: (error) => {
      toast.error(
        isApiError(error) ? error.message : 'Не удалось удалить дисциплину. Попробуйте ещё раз.',
      );
      onDeleted();
    },
  });

  return {
    remove: (subject: Subject) => mutation.mutate(subject),
    isPending: mutation.isPending,
  };
}
