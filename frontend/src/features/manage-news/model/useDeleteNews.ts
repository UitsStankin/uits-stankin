import { useMutation, useQueryClient } from '@tanstack/react-query';

import { newsKeys } from '@entities/news';
import { isApiError } from '@shared/api';
import { toast } from '@shared/store';
import type { News } from '@shared/types';

import { deleteNews } from '../api/newsAdminApi';

/**
 * Удаление записи.
 *
 * Отдельным хуком от формы: у удаления другая причина для изменения —
 * подтверждение и отказ, — а полей у него нет вовсе.
 *
 * Отказ показывается тостом, а не баннером в окне: окно подтверждения
 * к этому моменту закрывается, и держать его открытым ради строчки
 * с ошибкой означало бы предлагать нажать «Удалить» ещё раз — с тем же
 * результатом.
 *
 * Кэш сбрасывается целиком (`newsKeys.all`): удалённая запись исчезает
 * не только из админского списка, но и из ленты, из главной и из своей
 * статьи, где после удаления её ждёт `404`.
 */
export function useDeleteNews(onDeleted: () => void) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (news: News) => deleteNews(news.id),

    onSuccess: (_result, news) => {
      void queryClient.invalidateQueries({ queryKey: newsKeys.all });

      toast.success(`Запись «${news.title}» удалена`);
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
    remove: (news: News) => mutation.mutate(news),
    isPending: mutation.isPending,
  };
}
