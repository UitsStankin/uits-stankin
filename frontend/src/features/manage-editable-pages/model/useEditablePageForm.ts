import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { editablePageKeys } from '@entities/editable-page';
import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { EditablePage } from '@shared/types';

import { updateEditablePage } from '../api/editablePageAdminApi';
import {
  EDITABLE_PAGE_FIELDS,
  editablePageSchema,
  editablePageToFormValues,
  formValuesToRequest,
  type EditablePageFormValues,
} from './editablePageSchema';

/**
 * Форма раздела: подпись, исходник Markdown, запрос, разбор отказа.
 *
 * Только правка — создавать и удалять разделы контракт не даёт. Хук берёт
 * раздел начальными значениями, поэтому монтируется, когда раздел уже
 * на руках (`pages/admin/EditablePageFormPage`), — как форма карточки ППС.
 */
export function useEditablePageForm(page: EditablePage, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditablePageFormValues>({
    resolver: zodResolver(editablePageSchema),
    defaultValues: editablePageToFormValues(page),
  });

  /** Отказ, который не лёг ни на одно поле: `404`, сеть, `500`. */
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (values: EditablePageFormValues) =>
      updateEditablePage(page.slug, formValuesToRequest(values)),
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        /*
         * Вся ветка разделов: и сам раздел, который читают его страница
         * и главная, и список в админке, где у раздела поменялись подпись
         * и дата правки. Раздел читается одной и той же ручкой и на сайте,
         * и в форме, поэтому сброшенный ключ — это ровно то, что увидит
         * посетитель при следующем заходе.
         */
        void queryClient.invalidateQueries({ queryKey: editablePageKeys.all });

        toast.success(`Раздел «${saved.title ?? saved.slug}» сохранён`);
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError)),
    });
  });

  return {
    register,
    /** Для исходника: поле Markdown управляемое и живёт через `Controller`. */
    control,
    onSubmit,
    fieldErrors: errors,
    formError,
    isPending: saveMutation.isPending,
  };
}

/** Что показать после отказа. `null` — всё разложено по полям. */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<EditablePageFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить раздел. Попробуйте ещё раз.';

  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, EDITABLE_PAGE_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // `404` (миграция не доехала до стенда), сеть, `500` — баннером как есть.
  return error.message;
}
