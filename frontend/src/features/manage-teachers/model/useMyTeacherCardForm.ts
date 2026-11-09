import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { teacherKeys } from '@entities/teacher';
import { isApiError, useImageUpload } from '@shared/api';
import { applyFieldErrors, takeFieldErrors } from '@shared/lib';
import type { FileUploadResponse, Teacher } from '@shared/types';

import { updateMyTeacherCard } from '../api/teacherCardApi';
import {
  TEACHER_CARD_FIELDS,
  teacherCardSchema,
  teacherToFormValues,
  formValuesToRequest,
  type TeacherCardFormValues,
} from './teacherCardSchema';

/**
 * Правка **своей** карточки ППС из личного кабинета: проверка полей,
 * загрузка фото, запрос, разбор отказа.
 *
 * Соседний `useTeacherAdminForm` делает то же для модератора и отличается
 * тремя вещами: умеет заводить новую карточку, правит две сущности сверх
 * карточки (дисциплины и связь с учёткой) и ходит в другие ручки. Общего
 * у них — схема, начальные значения и разбор словаря `errors`, и это общее
 * лежит рядом, в `teacherCardSchema.ts`.
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
 * не то, что сохранится. Сама загрузка — проверка файла, запрос, текст
 * отказа — общая с формой профиля и редактором (`useImageUpload`).
 */
export function useMyTeacherCardForm(card: Teacher, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TeacherCardFormValues>({
    resolver: zodResolver(teacherCardSchema),
    defaultValues: teacherToFormValues(card),
  });

  /** Ошибка, которая не легла ни на одно поле: сеть, 500, 404. */
  const [formError, setFormError] = useState<string | null>(null);
  /**
   * Отказ по ключу фото — единственный, у которого здесь есть адрес.
   *
   * Учётную запись и дисциплины `PUT /api/teachers/me` игнорирует, значит
   * и отвергнуть их не может: из трёх ключей `errors` карточки ППС сюда
   * доезжает только `avatar` (docs/API.md, «Своя карточка»). Живёт своим
   * состоянием, потому что фото — не поле формы, а состояние загрузки,
   * и `setError` на него не наведёшь.
   */
  const [avatarError, setAvatarError] = useState<string | null>(null);
  /** Загруженное на замену фото; `null` — оставляем прежнее. */
  const [newAvatar, setNewAvatar] = useState<FileUploadResponse | null>(null);

  const avatarUpload = useImageUpload('avatars', setNewAvatar);
  const saveMutation = useMutation({ mutationFn: updateMyTeacherCard });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setAvatarError(null);

    // Ключ фото для полной замены: новый — из загрузки, иначе прежний
    // из карточки. `PUT` полностью заменяет запись, и не прислать ключ
    // значило бы стереть фото с диска физически.
    //
    // Раньше прежний ключ добывался разбором `avatarUrl`: в ответе его
    // не было вовсе, и форма умела отказать — «выберите фото заново», —
    // лишь бы не стереть молча. С T-44 ключ приходит полем, и вместе
    // с разбором адреса исчез и этот отказ.
    const avatar = newAvatar ? newAvatar.key : card.avatar;

    saveMutation.mutate(formValuesToRequest(values, avatar), {
      onSuccess: (fresh) => {
        // Ответ PUT — та же полная карточка, что отдаёт GET: кладём его
        // в кэш вместо инвалидации, и view-режим рисует свежие данные
        // без второго запроса.
        queryClient.setQueryData(teacherKeys.me(), fresh);
        onSaved();
      },
      onError: (error) => setFormError(describeTeacherCardError(error, setError, setAvatarError)),
    });
  });

  return {
    register,
    /**
     * Для полей, которые не являются элементом ввода: rich-text редактор
     * отдаёт строку HTML, а `register` цепляется к `onChange`
     * DOM-элемента, которого у `contenteditable` нет.
     */
    control,
    onSubmit,
    fieldErrors: errors,
    formError,
    /** Что показывать в кружке предпросмотра; `null` — заглушку. */
    avatarPreviewUrl: newAvatar?.url ?? card.avatarUrl,
    /**
     * Отказ сохранения показывается поверх ошибки загрузки: он про
     * последнее действие — только что нажатое «Сохранить», — а ошибка
     * загрузки к этому моменту уже прочитана. Снимается выбором нового
     * файла, то есть когда ошибка загрузки снова становится актуальной.
     */
    avatarError: avatarError ?? avatarUpload.error,
    isUploadingAvatar: avatarUpload.isUploading,
    onAvatarSelect: (file: File) => {
      setAvatarError(null);
      avatarUpload.select(file);
    },
    /**
     * Запрос в полёте: кнопка блокируется. Загрузка фото тоже считается:
     * сохранение в этот момент ушло бы со старым ключом, и только что
     * выбранное фото молча потерялось бы.
     */
    isPending: saveMutation.isPending || avatarUpload.isUploading,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по полям, общий
 * баннер не нужен.
 */
function describeTeacherCardError(
  error: unknown,
  setError: UseFormSetError<TeacherCardFormValues>,
  setAvatarError: (message: string | null) => void,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить карточку. Попробуйте ещё раз.';

  if (error.errors) {
    // Ключ фото — вперёд общего разбора: в форме он не поле, и без этого
    // уехал бы в «бездомные», то есть показался бы баннером вдобавок
    // к сообщению под рамкой — `detail` повторяет его дословно.
    const { taken, rest } = takeFieldErrors(error.errors, ['avatar']);
    setAvatarError(taken.avatar ?? null);

    const homeless = applyFieldErrors(rest, TEACHER_CARD_FIELDS, setError);
    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // Остальное — в баннер как есть: 400 без словаря (незнакомый код
  // степени), 404 (карточку отвязали, пока форма была открыта), сеть,
  // 500. Текст ApiError пригоден для показа.
  return error.message;
}
