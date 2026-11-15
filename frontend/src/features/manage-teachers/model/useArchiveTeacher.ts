import { useMutation, useQueryClient } from '@tanstack/react-query';

import { teacherKeys } from '@entities/teacher';
import { userKeys } from '@entities/user';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { TeacherListItem } from '@shared/types';

import { archiveTeacher, unarchiveTeacher } from '../api/teacherCardApi';

/**
 * Отправка карточки ППС в архив и возврат из него — одним хуком: у обоих
 * действий одна причина для изменения, и различаются они только ручкой
 * и словами тоста.
 *
 * Подтверждение спрашивают вызывающие, а не хук: текст окна у строки
 * таблицы и у формы разный (`lib/archiveText.ts`). Спрашивают только
 * перед архивом. С T-120 он блокирует привязанную учётную запись,
 * и возврат из архива её не разблокирует — это уже не «обратимо одной
 * кнопкой», как было, когда F-53 решил обходиться без окна. Возврат
 * по-прежнему без окна: он ничего не отнимает.
 *
 * Берёт короткую карточку — она есть и у строки таблицы, и у формы
 * (полная `Teacher` её расширяет); для тоста хватает фамилии и имени.
 *
 * Кэш сбрасывается целиком (`teacherKeys.all`): архив меняет состав
 * и публичного списка, и защищённого, и поле `archived` открытой карточки.
 * После архива — ещё и кэш учёток (`userKeys.all`): заблокированная
 * учётка уходит из справочника формы карточки, а живёт он пять минут,
 * и без сброса форма предлагала бы привязать заблокированного.
 * Отказ `400` на собственную карточку («архив заблокирует вашу учётную
 * запись») приходит словами сервера, как любой другой.
 */
export function useArchiveTeacher() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ teacher, archived }: { teacher: TeacherListItem; archived: boolean }) =>
      archived ? archiveTeacher(teacher.id) : unarchiveTeacher(teacher.id),

    onSuccess: (_result, { teacher, archived }) => {
      void queryClient.invalidateQueries({ queryKey: teacherKeys.all });
      if (archived) void queryClient.invalidateQueries({ queryKey: userKeys.all });

      const name = `${teacher.lastName} ${teacher.firstName}`;
      toast.success(
        archived ? `Карточка «${name}» в архиве` : `Карточка «${name}» возвращена из архива`,
      );
    },

    onError: (error, { archived }) => {
      toast.error(
        isApiError(error)
          ? error.message
          : archived
            ? 'Не удалось отправить карточку в архив. Попробуйте ещё раз.'
            : 'Не удалось вернуть карточку из архива. Попробуйте ещё раз.',
      );
    },
  });

  return {
    archive: (teacher: TeacherListItem) => mutation.mutate({ teacher, archived: true }),
    unarchive: (teacher: TeacherListItem) => mutation.mutate({ teacher, archived: false }),
    /** Запрос в полёте: кнопка на форме заперта, второго не уйдёт. */
    isPending: mutation.isPending,
  };
}
