import { useMutation, useQueryClient } from '@tanstack/react-query';

import { teacherKeys } from '@entities/teacher';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { TeacherListItem } from '@shared/types';

import { deleteTeacher } from '../api/teacherCardApi';

/**
 * Удаление карточки ППС.
 *
 * Отдельным хуком от формы: у удаления другая причина для изменения —
 * подтверждение и отказ, — а полей у него нет вовсе.
 *
 * Берёт **короткую** карточку: раздел админки читает списочную ручку,
 * и полной у него на руках нет. Для тоста хватает фамилии и имени —
 * догружать ради подписи всю карточку значило бы делать лишний запрос
 * перед удалением.
 *
 * Отказ показывается тостом, а не баннером в окне: окно подтверждения
 * к этому моменту закрывается, и держать его открытым ради строчки
 * с ошибкой означало бы предлагать нажать «Удалить» ещё раз — с тем же
 * результатом.
 *
 * Кэш сбрасывается целиком (`teacherKeys.all`): удалённая карточка
 * исчезает не только из админского списка, но и из публичного, и со своей
 * страницы, где после удаления её ждёт `404`.
 */
export function useDeleteTeacher(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (teacher: TeacherListItem) => deleteTeacher(teacher.id),

    onSuccess: (_result, teacher) => {
      void queryClient.invalidateQueries({ queryKey: teacherKeys.all });

      toast.success(`Карточка «${teacher.lastName} ${teacher.firstName}» удалена`);
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
    remove: (teacher: TeacherListItem) => mutation.mutate(teacher),
    isPending: mutation.isPending,
  };
}
