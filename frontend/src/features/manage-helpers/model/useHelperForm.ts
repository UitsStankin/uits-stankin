import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { helperKeys } from '@entities/helper';
import { isApiError, useImageUpload } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { Helper } from '@shared/types';

import { createHelper, updateHelper } from '../api/helperAdminApi';
import {
  HELPER_FIELDS,
  formValuesToRequest,
  helperSchema,
  helperToFormValues,
  type HelperFormValues,
} from './helperSchema';

/**
 * Форма карточки УВП: проверка полей, загрузка фото, запрос, разбор
 * отказа.
 *
 * `helper` — правим существующую; `null` — заводим новую. Одна форма
 * на оба случая: поля и проверки у них одни и те же, а тела `POST`
 * и `PUT` в контракте совпадают побайтово.
 *
 * Компонент с этим хуком монтируется на время правки и размонтируется
 * по «Отмене» — так «начальные значения» и «брошенные правки» не требуют
 * ручного сброса.
 *
 * **Начальные значения берутся из строки списка**, без догрузки: карточка
 * УВП целиком помещается в элементе списка, включая ключ фото. Ручка
 * одной карточки (`GET /api/public/helpers/{id}`) в контракте есть
 * и заведена «для формы правки», но нам она не нужна — искать в списке
 * постранично не приходится, вся карточка уже на экране. Тем УВП
 * и отличается от ППС, чья форма живёт отдельной страницей.
 *
 * **Фото не поле формы, а отдельное состояние** — как у карточки ППС:
 * файл уходит на сервер сразу при выборе (`POST /api/files`, раздел
 * `avatars`), а в форме остаётся ключ из ответа.
 */
export function useHelperForm(helper: Helper | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<HelperFormValues>({
    resolver: zodResolver(helperSchema),
    defaultValues: helperToFormValues(helper),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, негодный ключ фото. */
  const [formError, setFormError] = useState<string | null>(null);

  const [avatar, setAvatar] = useState({
    key: helper?.avatar ?? null,
    url: helper?.avatarUrl ?? null,
  });

  const avatarUpload = useImageUpload('avatars', (uploaded) =>
    setAvatar({ key: uploaded.key, url: uploaded.url }),
  );

  const saveMutation = useMutation({
    mutationFn: (values: HelperFormValues) => {
      const body = formValuesToRequest(values, avatar.key);

      return helper ? updateHelper(helper.id, body) : createHelper(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        // Инвалидация, а не подстановка ответа в кэш: в кэше лежат
        // страницы списка, и место новой карточки в них зависит
        // от порядка и от того, сколько фамилий стоит перед ней.
        // Вычислять это на клиенте значило бы повторять запрос Spring.
        void queryClient.invalidateQueries({ queryKey: helperKeys.all });

        toast.success(
          helper
            ? `Карточка «${saved.lastName} ${saved.firstName}» сохранена`
            : `Карточка «${saved.lastName} ${saved.firstName}» создана`,
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

    avatarPreviewUrl: avatar.url,
    avatarError: avatarUpload.error,
    isUploadingAvatar: avatarUpload.isUploading,
    onAvatarSelect: avatarUpload.select,
    /**
     * Снять фото. Отправленный `avatar: null` не просто забывает ключ —
     * бэкенд удаляет файл с диска, поэтому «убрать» здесь означает именно
     * убрать. Кнопка есть, в отличие от личного кабинета: это чужая
     * карточка, и снять фото уволившегося сотрудника надо уметь.
     */
    onAvatarRemove: () => {
      setAvatar({ key: null, url: null });
      avatarUpload.clearError();
    },

    /**
     * Запрос в полёте: кнопка заблокирована. Загрузка фото тоже считается:
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
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<HelperFormValues>,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить карточку. Попробуйте ещё раз.';

  // Словарь от `@Valid`: имена в нём — имена полей формы.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, HELPER_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  // Остальное — в баннер как есть: `400` без словаря (ключ фото, которого
  // нет в хранилище), `404` (карточку удалили, пока форма была открыта),
  // сеть, `500`. Текст ApiError пригоден для показа.
  return error.message;
}
