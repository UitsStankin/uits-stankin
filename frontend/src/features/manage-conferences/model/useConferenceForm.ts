import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { conferenceKeys } from '@entities/conference';
import { isApiError, useImageUpload } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { Conference } from '@shared/types';

import { createConference, updateConference } from '../api/conferenceAdminApi';
import {
  CONFERENCE_FIELDS,
  conferenceSchema,
  conferenceToFormValues,
  formValuesToRequest,
  type ConferenceFormValues,
} from './conferenceSchema';

/** Что показывать в рамке предпросмотра и что отправлять в `previewImage`. */
type Cover = {
  /** Ключ файла — то, что уедет в запрос. `null` — обложки нет. */
  key: string | null;
  /** Адрес для показа. Собирает его сервер, не мы. */
  url: string | null;
};

/**
 * Форма объявления о конференции: проверка полей, загрузка обложки, запрос,
 * разбор отказа.
 *
 * `conference` — правим существующее; `null` — заводим новое. Одна форма
 * на оба случая: тела `POST` и `PUT` в контракте совпадают побайтово.
 *
 * Устроена как форма новости (`features/manage-news/model/useNewsForm.ts`),
 * и расходятся они полями, а не механикой: обложка у конференции живёт
 * в том же разделе хранилища `news` (docs/API.md, «Загрузка файлов»),
 * снимается так же и так же удаляет файл с диска. Общего хука на две формы
 * нет намеренно: общее у них — загрузка, и она уже одна (`useImageUpload`),
 * а оставшийся десяток строк состояния в каждой форме расходится на своём —
 * у достижения, например, обложку снять нельзя вовсе.
 */
export function useConferenceForm(conference: Conference | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ConferenceFormValues>({
    resolver: zodResolver(conferenceSchema),
    defaultValues: conferenceToFormValues(conference),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, негодный ключ обложки. */
  const [formError, setFormError] = useState<string | null>(null);

  const [cover, setCover] = useState<Cover>({
    key: conference?.previewImage ?? null,
    url: conference?.previewImageUrl ?? null,
  });

  const coverUpload = useImageUpload('news', (uploaded) =>
    setCover({ key: uploaded.key, url: uploaded.url }),
  );

  const saveMutation = useMutation({
    mutationFn: (values: ConferenceFormValues) => {
      const body = formValuesToRequest(values, cover.key);

      return conference ? updateConference(conference.id, body) : createConference(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        // Весь кэш конференций, а не только админский список: правка одного
        // объявления меняет и его, и публичный список, и открытое объявление.
        // Разбор «инвалидация, а не подстановка ответа» — у `useNewsForm`.
        void queryClient.invalidateQueries({ queryKey: conferenceKeys.all });

        toast.success(
          conference ? `Конференция «${saved.title}» сохранена` : `Конференция «${saved.title}» создана`,
        );
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError)),
    });
  });

  return {
    register,
    /** Для rich-text поля: у `contenteditable` нет `onChange`, за который цепляется `register`. */
    control,
    onSubmit,
    fieldErrors: errors,
    formError,

    /** Что показывать в рамке; `null` — пустую рамку обложки. */
    coverUrl: cover.url,
    /** Есть ли обложка: от этого зависит, спрашивать ли её описание. */
    hasCover: cover.key !== null,
    coverError: coverUpload.error,
    isUploadingCover: coverUpload.isUploading,
    onCoverSelect: coverUpload.select,
    /**
     * Снять обложку. `previewImage: null` бэкенд понимает как «удалить файл
     * с диска», а не «спрятать». Описание стирается вместе с картинкой —
     * разбор, почему это не уборка ради порядка, у `useNewsForm`.
     */
    onCoverRemove: () => {
      setCover({ key: null, url: null });
      setValue('previewImageDescription', '');
      coverUpload.clearError();
    },

    /**
     * Запрос в полёте: кнопка заблокирована. Загрузка обложки тоже считается:
     * сохранение в этот момент ушло бы со старым ключом, и только что
     * выбранная картинка молча потерялась бы.
     */
    isPending: saveMutation.isPending || coverUpload.isUploading,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по полям, общий
 * баннер не нужен.
 */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<ConferenceFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить конференцию. Попробуйте ещё раз.';

  // Словарь от `@Valid`, включая связку дат: имена в нём — имена полей формы.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, CONFERENCE_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Остальное — в баннер как есть: `400` без словаря (ключ обложки, которого
   * нет в хранилище, в том числе убранный уборщиком сирот из долго открытой
   * формы), `404` (объявление удалили, пока форма была открыта), сеть, `500`.
   */
  return error.message;
}
