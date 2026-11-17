import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type UseFormSetError } from 'react-hook-form';

import { eventKeys } from '@entities/event';
import { userDirectoryQuery } from '@entities/user';
import { isApiError } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { UserEvent } from '@shared/types';

import { createEvent, updateEvent } from '../api/eventAdminApi';
import {
  EVENT_FIELDS,
  SERVER_FIELD_ALIASES,
  eventSchema,
  eventToFormValues,
  formValuesToRequest,
  isColorValid,
  type EventFormValues,
} from './eventSchema';

/**
 * Форма события: проверка полей, справочник для назначенных, запрос,
 * разбор отказа.
 *
 * `event` — правим существующее; `null` — заводим новое в день `day`.
 * Одна форма на оба случая: тела `POST` и `PUT` совпадают.
 *
 * **Справочник — тот же, что у формы карточки ППС** (`userDirectoryQuery`),
 * и открыт он той же паре ролей, что и календарь. Преподаватель тоже
 * назначает: в оригинале поле от него пряталось, а запрос молча
 * подменялся на «назначить себя», контракт это снял (docs/API.md).
 *
 * Назначенные живут в react-hook-form (через `Controller`), а не в
 * состоянии хука, как связь карточки ППС: отказ по ним приходит
 * словарём под тем же именем `assignedUserIds`, и встать ему есть куда.
 */
export function useEventForm(event: UserEvent | null, day: Date, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: eventToFormValues(event, day),
  });

  // Поля времени прячутся у «весь день» — форма должна знать флажок
  // на каждом рендере, а не на отправке.
  const allDay = useWatch({ control, name: 'allDay' });

  const directory = useQuery(userDirectoryQuery);

  /** Отказ, который не лёг ни на одно поле: сеть, `404`, `500`, конец раньше начала. */
  const [formError, setFormError] = useState<string | null>(null);

  const saveMutation = useMutation({
    mutationFn: (values: EventFormValues) => {
      const body = formValuesToRequest(values, event?.notificationFrequency ?? 'NONE');

      return event ? updateEvent(event.id, body) : createEvent(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        // Корень целиком: событие меняет и сетку, и список, и открытую
        // карточку. Разбор «инвалидация, а не подстановка» — у `useNewsForm`.
        void queryClient.invalidateQueries({ queryKey: eventKeys.all });

        toast.success(event ? `Событие «${saved.name}» сохранено` : `Событие «${saved.name}» создано`);
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
    isPending: saveMutation.isPending,
    allDay,

    accounts: directory.data?.content ?? [],
    isDirectoryLoading: directory.isLoading,
    hasDirectoryFailed: directory.isError,
    /**
     * Назначенные, которые уже стоят на событии: справочник отдаёт только
     * действующих преподавателей, и заблокированный назначенный без своего
     * ФИО из события остался бы в форме безымянным номером.
     */
    knownAssignees: event?.assignedUsers ?? [],

    /** Цвет события не по контракту — форма показала умолчание вместо него. */
    replacedColor: event && !isColorValid(event.color) ? event.color : null,
  };
}

/** Что показать после отказа. `null` — всё разложено по полям. */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<EventFormValues>,
): string | null {
  if (!isApiError(error)) return 'Не удалось сохранить событие. Попробуйте ещё раз.';

  if (error.errors) {
    const renamed = Object.fromEntries(
      Object.entries(error.errors).map(([field, messages]) => [
        SERVER_FIELD_ALIASES[field] ?? field,
        messages,
      ]),
    );
    const homeless = applyFieldErrors(renamed, EVENT_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Без словаря — в баннер как есть: конец раньше начала и неизвестный
   * назначенный приходят одним `detail` (`InvalidRequestException`),
   * `404` — событие удалили или с него сняли, пока форма была открыта.
   */
  return error.message;
}
