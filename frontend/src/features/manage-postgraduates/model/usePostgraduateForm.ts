import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { postgraduateKeys } from '@entities/postgraduate';
import { adminTeachersListQuery } from '@entities/teacher';
import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { PostgraduateDetails } from '@shared/types';

import { createPostgraduate, updatePostgraduate } from '../api/postgraduateAdminApi';
import {
  POSTGRADUATE_FIELDS,
  formValuesToRequest,
  postgraduateSchema,
  postgraduateToFormValues,
  type PostgraduateFormValues,
} from './postgraduateSchema';

/**
 * Список руководителей — одним запросом на сотню, как у формы достижения
 * (разбор там же, в `useAchievementForm`): выпадающий список не листают,
 * и карточка со второй страницы просто не нашлась бы. Список защищённый,
 * с архивными: подписи руководителя в записи нет, и архивный руководитель
 * из публичного списка подписывался бы «Карточка № N» (F-53).
 */
const TEACHERS_QUERY = adminTeachersListQuery({ size: 100 });

/**
 * Форма записи аспирантуры: проверка полей, выбор руководителя, запрос,
 * разбор отказа.
 *
 * `postgraduate` — правим существующую (уже загруженную с сервера);
 * `null` — заводим новую. Одна форма на оба случая: тела `POST` и `PUT`
 * в контракте совпадают.
 *
 * Хук монтируется, когда запись уже на руках, и умирает вместе
 * со страницей формы, — поэтому «начальные значения» и «брошенные правки»
 * не требуют ручного сброса.
 *
 * Руководитель живёт в react-hook-form через `Controller`, а не через
 * `register`, по той же причине, что у достижения: варианты приезжают
 * позже формы, и `register` показал бы «не назначен» при сохранённой
 * ссылке.
 */
export function usePostgraduateForm(postgraduate: PostgraduateDetails | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PostgraduateFormValues>({
    resolver: zodResolver(postgraduateSchema),
    defaultValues: postgraduateToFormValues(postgraduate),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, `404`, удалённый руководитель. */
  const [formError, setFormError] = useState<string | null>(null);

  const teachersQuery = useQuery(TEACHERS_QUERY);

  const saveMutation = useMutation({
    mutationFn: (values: PostgraduateFormValues) => {
      const body = formValuesToRequest(values);

      return postgraduate ? updatePostgraduate(postgraduate.id, body) : createPostgraduate(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        // Вся ветка: список админки, публичная таблица и сама запись.
        // Ответ записи в кэш не подставляется — он в форме элемента
        // списка, а место записи на странице зависит от фамилий вокруг.
        void queryClient.invalidateQueries({ queryKey: postgraduateKeys.all });

        toast.success(
          postgraduate
            ? `Запись «${saved.studentName}» сохранена`
            : `Запись «${saved.studentName}» создана`,
        );
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError)),
    });
  });

  return {
    register,
    control,
    onSubmit,
    fieldErrors: errors,
    formError,

    teachers: teachersQuery.data?.content ?? [],
    isLoadingTeachers: teachersQuery.isLoading,
    hasTeachersFailed: teachersQuery.isError,

    isPending: saveMutation.isPending,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по полям, общий
 * баннер не нужен.
 */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<PostgraduateFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить запись. Попробуйте ещё раз.';

  // Словарь от `@Valid`: имена в нём — пути полей формы (`student.group`).
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, POSTGRADUATE_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Остальное — баннером как есть. Проверки сервиса словаря не дают:
   * год в будущем (форма ловит его раньше, кроме разошедшихся часов),
   * руководитель, чью карточку удалили, пока форма была открыта
   * («Преподаватель не найден: id=N»). И ещё `404` — запись удалили
   * в другой вкладке, — сеть и `500`.
   */
  return error.message;
}
