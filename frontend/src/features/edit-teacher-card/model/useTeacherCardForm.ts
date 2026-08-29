import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { teacherKeys } from '@entities/teacher';
import { isApiError, uploadFile } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import type { FileUploadResponse, Teacher } from '@shared/types';

import { updateMyTeacherCard } from '../api/teacherCardApi';
import { avatarKeyFromUrl } from '../lib/avatarKey';
import {
  TEACHER_CARD_FIELDS,
  teacherCardSchema,
  teacherToFormValues,
  formValuesToRequest,
  type TeacherCardFormValues,
} from './teacherCardSchema';

/**
 * Вся логика формы карточки ППС: проверка полей, загрузка фото, запрос,
 * разбор отказа.
 *
 * `card` — загруженная карточка: из неё берутся начальные значения формы.
 * Компонент с этим хуком монтируется на время правки и размонтируется
 * по «Отмене» — так «начальные значения» и «брошенные правки» не требуют
 * ручного сброса.
 *
 * Фото не поле формы, а отдельное состояние: файл уходит на сервер сразу
 * при выборе (`POST /api/files`, `category: avatars`), в форме остаётся
 * только ключ из ответа. Предпросмотр — тоже из ответа: сервер картинку
 * перекодирует и ужимает, показывать локальный файл значило бы показывать
 * не то, что сохранится.
 */
export function useTeacherCardForm(card: Teacher, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TeacherCardFormValues>({
    resolver: zodResolver(teacherCardSchema),
    defaultValues: teacherToFormValues(card),
  });

  /** Ошибка, которая не легла ни на одно поле: сеть, 500, негодный ключ фото. */
  const [formError, setFormError] = useState<string | null>(null);
  /** Загруженное на замену фото; `null` — оставляем прежнее. */
  const [newAvatar, setNewAvatar] = useState<FileUploadResponse | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const uploadMutation = useMutation({ mutationFn: (file: File) => uploadFile(file, 'avatars') });
  const saveMutation = useMutation({ mutationFn: updateMyTeacherCard });

  const onAvatarSelect = (file: File) => {
    setAvatarError(null);

    // Те же границы, что на сервере, но до запроса: файл не тот — узнать
    // об этом лучше не после отправки пятнадцати мегабайт. Сервер при этом
    // строже: формат он определяет по содержимому, а не по типу файла.
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setAvatarError('Фото — только JPEG или PNG.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setAvatarError('Файл больше 15 МБ.');
      return;
    }

    uploadMutation.mutate(file, {
      onSuccess: setNewAvatar,
      onError: (error) =>
        setAvatarError(
          isApiError(error) ? error.message : 'Не удалось загрузить фото. Попробуйте ещё раз.',
        ),
    });
  };

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    // Ключ фото для полной замены: новый — из загрузки, прежний — из
    // адреса (времянка, см. lib/avatarKey.ts). Не определился — не
    // сохраняем: молча отправить null значило бы стереть фото с диска.
    let avatar: string | null;
    if (newAvatar) {
      avatar = newAvatar.key;
    } else if (card.avatarUrl === null) {
      avatar = null;
    } else {
      const derived = avatarKeyFromUrl(card.avatarUrl);
      if (derived === null) {
        setFormError('Не удалось сохранить текущее фото. Выберите его заново и повторите.');
        return;
      }
      avatar = derived;
    }

    saveMutation.mutate(formValuesToRequest(values, avatar), {
      onSuccess: (fresh) => {
        // Ответ PUT — та же полная карточка, что отдаёт GET: кладём его
        // в кэш вместо инвалидации, и view-режим рисует свежие данные
        // без второго запроса.
        queryClient.setQueryData(teacherKeys.me(), fresh);
        onSaved();
      },
      onError: (error) => setFormError(describeTeacherCardError(error, setError)),
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    /** Что показывать в кружке предпросмотра; `null` — заглушку. */
    avatarPreviewUrl: newAvatar?.url ?? card.avatarUrl,
    avatarError,
    isUploadingAvatar: uploadMutation.isPending,
    onAvatarSelect,
    /**
     * Запрос в полёте: кнопка блокируется. Загрузка фото тоже считается:
     * сохранение в этот момент ушло бы со старым ключом, и только что
     * выбранное фото молча потерялось бы.
     */
    isPending: saveMutation.isPending || uploadMutation.isPending,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по полям, общий
 * баннер не нужен.
 */
function describeTeacherCardError(
  error: unknown,
  setError: UseFormSetError<TeacherCardFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить карточку. Попробуйте ещё раз.';

  // Словарь от `@Valid`: имена в нём — имена полей формы.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, TEACHER_CARD_FIELDS, setError);
    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // Остальное — в баннер как есть: 400 без словаря (негодный ключ фото,
  // незнакомый код степени), 404 (карточку отвязали, пока форма была
  // открыта), сеть, 500. Текст ApiError пригоден для показа.
  return error.message;
}
