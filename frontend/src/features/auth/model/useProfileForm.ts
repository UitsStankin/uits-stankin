import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { isApiError, uploadFile } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import type { FileUploadResponse, Profile } from '@shared/types';

import { updateProfile } from '../api/authApi';
import { authKeys } from '../api/profileQuery';
import {
  PROFILE_FIELDS,
  formValuesToRequest,
  profileSchema,
  profileToFormValues,
  type ProfileFormValues,
} from './profileSchema';

/**
 * Что решено с аватаром за время правки.
 *
 * `null` — не трогали: в запрос уйдёт прежний ключ из профиля. Три
 * состояния в одной переменной, а не пара флагов: «загрузил новое»
 * и «удалил» исключают друг друга, и двумя булевыми полями это
 * пришлось бы держать в голове, а не в типе.
 */
type AvatarChange = FileUploadResponse | 'removed' | null;

/**
 * Вся логика формы профиля: проверка полей, загрузка аватара, запрос,
 * разбор отказа (F-27).
 *
 * `profile` — уже загруженный профиль: из него берутся начальные значения.
 * Компонент с этим хуком монтируется на время правки и размонтируется
 * по «Отмене» — так «начальные значения» и «брошенные правки» не требуют
 * ручного сброса.
 *
 * Аватар не поле формы, а отдельное состояние: файл уходит на сервер сразу
 * при выборе (`POST /api/files`, `category: avatars` — этот раздел открыт
 * любому авторизованному, а не только модератору), в форме остаётся только
 * ключ из ответа. Предпросмотр — тоже из ответа: сервер картинку
 * перекодирует и ужимает, показывать локальный файл значило бы показывать
 * не то, что сохранится.
 *
 * Фича живёт в `auth`, а не отдельным слайсом, — и по той самой причине,
 * по которой смена пароля вынесена отдельно. Та профиля не касается
 * и кэш не трогает вовсе; правка меняет ровно те данные, которыми
 * заведует `auth`: ответ `PUT` ложится на ключ `['profile']`, и вместе
 * с ним меняется имя и аватар в шапке. Отдельный слайс пришлось бы завести
 * на чужом ключе кэша — на импорте одной фичи из другой, которого
 * в проекте нет ни одного.
 */
export function useProfileForm(profile: Profile, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(profile),
  });

  /** Ошибка, которая не легла ни на одно поле: сеть, 500, негодный ключ. */
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarChange, setAvatarChange] = useState<AvatarChange>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const uploadMutation = useMutation({ mutationFn: (file: File) => uploadFile(file, 'avatars') });
  const saveMutation = useMutation({ mutationFn: updateProfile });

  const onAvatarSelect = (file: File) => {
    setAvatarError(null);

    // Те же границы, что на сервере, но до запроса: файл не тот — узнать
    // об этом лучше не после отправки пятнадцати мегабайт. Сервер при этом
    // строже: формат он определяет по содержимому, а не по типу файла,
    // и отдельно считает мегапиксели, которых у файла тут не спросить.
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setAvatarError('Фото — только JPEG или PNG.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setAvatarError('Файл больше 15 МБ.');
      return;
    }

    uploadMutation.mutate(file, {
      onSuccess: setAvatarChange,
      onError: (error) =>
        setAvatarError(
          isApiError(error) ? error.message : 'Не удалось загрузить фото. Попробуйте ещё раз.',
        ),
    });
  };

  /**
   * Убрать аватар. Отдельная операция, а не «выбрать пустой файл»:
   * контракт объявляет `avatar: null` очисткой, и без кнопки загруженное
   * по ошибке фото можно было бы только заменить другим.
   *
   * Файл на сервере переживает нажатие: удаляет его бэкенд после успешного
   * `PUT`, а до «Сохранить» это только решение, отменяемое «Отменой».
   */
  const onAvatarRemove = () => {
    setAvatarError(null);
    setAvatarChange('removed');
  };

  /**
   * Ключ для полной замены: удалили — `null`, загрузили новый — новый,
   * не трогали — прежний из профиля. Не прислать ключ нетронутого аватара
   * значило бы стереть фото с диска физически.
   */
  const avatarKey =
    avatarChange === 'removed' ? null : (avatarChange?.key ?? profile.avatar);
  const avatarPreviewUrl =
    avatarChange === 'removed' ? null : (avatarChange?.url ?? profile.avatarUrl);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(formValuesToRequest(values, avatarKey), {
      onSuccess: (fresh) => {
        // Ответ `PUT` — тот же полный профиль, что отдаёт `GET`: кладём его
        // на ключ `['profile']` вместо инвалидации. Второго запроса нет,
        // а шапка, читающая тот же ключ, обновляется тем же движением.
        queryClient.setQueryData(authKeys.profile, fresh);
        onSaved();
      },
      onError: (error) => setFormError(describeProfileError(error, setError)),
    });
  });

  return {
    register,
    onSubmit,
    fieldErrors: errors,
    formError,
    /**
     * Что показывать в кружке предпросмотра; `null` — заглушку. По нему же
     * `AvatarPicker` решает, показывать ли «Удалить фото»: нечего убирать —
     * нет и кнопки.
     */
    avatarPreviewUrl,
    avatarError,
    isUploadingAvatar: uploadMutation.isPending,
    onAvatarSelect,
    onAvatarRemove,
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
function describeProfileError(
  error: unknown,
  setError: UseFormSetError<ProfileFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить профиль. Попробуйте ещё раз.';

  // Словарь от `@Valid`: имена в нём — имена полей формы.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, PROFILE_FIELDS, setError);
    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // Остальное — в баннер как есть: `400` без словаря (ключ аватара не найден
  // в разделе `avatars` — например, файл вычистила уборка сирот, пока форма
  // была открыта), сеть, 500. Текст ApiError пригоден для показа.
  //
  // `401` сюда тоже доедет, но показывать его некому: интерцептор уже сходил
  // за обменом токена, а на его отказ стёр сессию и увёл на форму входа.
  return error.message;
}
