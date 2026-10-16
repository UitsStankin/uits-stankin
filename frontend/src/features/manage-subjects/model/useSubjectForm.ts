import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { subjectKeys } from '@entities/subject';
import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { Subject } from '@shared/types';

import { createSubject, updateSubject } from '../api/subjectAdminApi';
import {
  SUBJECT_FIELDS,
  formValuesToRequest,
  subjectSchema,
  subjectToFormValues,
  type SubjectFormValues,
} from './subjectSchema';

/**
 * Форма дисциплины: проверка полей, запрос, разбор отказа.
 *
 * `subject` — правим существующую; `null` — заводим новую. Одна форма
 * на оба случая, потому что поля и проверки у них одни и те же,
 * а тела запросов `POST` и `PUT` в контракте совпадают побайтово.
 *
 * Компонент с этим хуком монтируется на время правки и размонтируется
 * по «Отмене» — так «начальные значения» и «брошенные правки»
 * не требуют ручного сброса.
 */
export function useSubjectForm(subject: Subject | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: subjectToFormValues(subject),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, 500, исчезнувшая запись. */
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (values: SubjectFormValues) => {
      const body = formValuesToRequest(values);

      return subject ? updateSubject(subject.id, body) : createSubject(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        // Инвалидация, а не подстановка ответа в кэш, как у карточки ППС:
        // там ключ один и известен, здесь ответ — одна дисциплина,
        // а в кэше лежат страницы списка, и место новой записи в них
        // зависит от сортировки и от того, сколько дисциплин перед ней.
        // Вычислять это на клиенте значило бы повторять сортировку Spring.
        void queryClient.invalidateQueries({ queryKey: subjectKeys.lists() });

        toast.success(
          subject ? `Дисциплина «${saved.name}» сохранена` : `Дисциплина «${saved.name}» добавлена`,
        );
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError)),
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    isPending: saveMutation.isPending,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по полям, общий
 * баннер не нужен.
 */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<SubjectFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить дисциплину. Попробуйте ещё раз.';

  // Словарь: имена в нём — имена полей формы. Приходит и от `@Valid`,
  // и от проверок самого сервиса — с T-80 занятое название отвечает
  // так же (B-6), поэтому разбор здесь один на оба случая.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, SUBJECT_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Остальное — в баннер как есть: `404` (дисциплину удалили, пока форма
   * была открыта), сеть, `500`. Текст ApiError пригоден для показа.
   *
   * Занятого названия здесь больше нет — оно уходит веткой выше, вместе
   * со всеми словарными отказами, и встаёт под полем «Название». Путь
   * до этого занял две заявки: **B-4** (`c9f8597`, 2026-09-07) заменила
   * `409` «Конфликт данных.» от уникального индекса на `400` с внятным
   * текстом, а **B-6** (`05e5039`, 2026-09-10) добавила к нему словарь
   * `errors`. Своего перевода отказа форма не делает ни на одном шаге
   * этого пути: сначала показывала текст сервера баннером, теперь —
   * под полем, и оба раза словами сервера.
   */
  return error.message;
}
