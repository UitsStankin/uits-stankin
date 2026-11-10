import { useState, type FormEventHandler } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { achievementKeys } from '@entities/achievement';
import { adminTeachersListQuery } from '@entities/teacher';
import { isApiError, useImageUpload } from '@shared/api';
import { applyFieldErrors, takeFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { Achievement } from '@shared/types';

import { createAchievement, updateAchievement } from '../api/achievementAdminApi';
import {
  ACHIEVEMENT_FIELDS,
  achievementSchema,
  achievementToFormValues,
  formValuesToRequest,
  type AchievementFormValues,
} from './achievementSchema';

/**
 * Список преподавателей для выбора — одним запросом на сотню, а не
 * постранично: это выпадающий список, и карточка со второй страницы
 * просто не нашлась бы. Сотня — потолок контракта (`size` урезается
 * до неё молча); на кафедре карточек втрое меньше. Порядок — умолчание
 * списочной ручки, по фамилии.
 *
 * Список **защищённый**, со всеми карточками, а не публичный (F-53):
 * публичный архивных не отдаёт, и достижение ушедшего преподавателя
 * открылось бы с владельцем, которого нет среди вариантов. Подпись бы
 * спасла `teacherName` из записи, но у руководителя аспиранта её нет
 * вовсе — правило одно на оба выбора. Архивные подписаны в списке
 * (`TeacherSelect`).
 */
const TEACHERS_QUERY = adminTeachersListQuery({ size: 100 });

/** Что показывать в рамке и что отправлять в `previewImage`. */
type Cover = {
  key: string | null;
  url: string | null;
};

/**
 * Форма достижения: проверка полей, обложка, выбор преподавателя, запрос,
 * разбор отказа.
 *
 * `achievement` — правим существующее; `null` — заводим новое.
 *
 * Механика та же, что у новости и конференции, и расходится она в двух
 * местах — оба от контракта.
 *
 * **Обложка обязательна и не снимается.** `PUT` без `previewImage` — это
 * `400`, а не достижение без картинки, поэтому кнопки «Убрать» нет,
 * а заменить картинку можно. Пустоту обложки схема формы не видит —
 * обложка живёт мимо react-hook-form, — и проверяется она здесь же, тем
 * же нажатием и вместе с полями: иначе человек сначала исправил бы поля,
 * а про обложку узнал бы со второй попытки.
 *
 * **Преподаватель выбирается из списка, который едет отдельным запросом.**
 * Поле при этом живёт в react-hook-form через `Controller`, а не через
 * `register`: `register` помнит значение в DOM, и список, дорисовавший
 * варианты позже формы, показал бы «кафедральное» при сохранённой ссылке
 * на преподавателя — а следующее касание списка её бы и стёрло.
 */
export function useAchievementForm(achievement: Achievement | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AchievementFormValues>({
    resolver: zodResolver(achievementSchema),
    defaultValues: achievementToFormValues(achievement),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, `404`, удалённая карточка ППС. */
  const [formError, setFormError] = useState<string | null>(null);

  const [cover, setCover] = useState<Cover>({
    key: achievement?.previewImage ?? null,
    url: achievement?.previewImageUrl ?? null,
  });

  /**
   * Почему с этой обложкой не сохранить: её нет вовсе либо сервер отказал
   * по ключу. Своим состоянием, потому что `setError` на обложку
   * не наведёшь, а показать сообщение надо под рамкой, а не баннером.
   */
  const [coverRefusal, setCoverRefusal] = useState<string | null>(null);

  const coverUpload = useImageUpload('achievements', (uploaded) =>
    setCover({ key: uploaded.key, url: uploaded.url }),
  );

  const teachersQuery = useQuery(TEACHERS_QUERY);

  const saveMutation = useMutation({
    mutationFn: ({ values, previewImage }: { values: AchievementFormValues; previewImage: string }) => {
      const body = formValuesToRequest(values, previewImage);

      return achievement ? updateAchievement(achievement.id, body) : createAchievement(body);
    },
  });

  const submitValid = handleSubmit((values) => {
    // Поля в порядке, а обложки нет: сообщение уже стоит под рамкой.
    if (cover.key === null) return;

    setFormError(null);

    saveMutation.mutate(
      { values, previewImage: cover.key },
      {
        onSuccess: (saved) => {
          /*
           * Весь кэш достижений: правка меняет админский список, раздел
           * на сайте, открытое достижение и блок на карточке преподавателя —
           * причём, если привязку сменили, на двух карточках сразу.
           */
          void queryClient.invalidateQueries({ queryKey: achievementKeys.all });

          toast.success(
            achievement ? `Достижение «${saved.title}» сохранено` : `Достижение «${saved.title}» создано`,
          );
          onSaved();
        },
        onError: (error) => setFormError(describeSaveError(error, setError, setCoverRefusal)),
      },
    );
  });

  /**
   * Отправка: сперва обложка, потом поля — и то и другое одним нажатием.
   * Отказ по обложке от прошлой попытки здесь же и снимается: новая
   * попытка — новый ответ.
   */
  const onSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    setCoverRefusal(cover.key === null ? 'Добавьте обложку: без неё достижение не сохранится.' : null);
    void submitValid(event);
  };

  return {
    register,
    /** Для rich-text поля и выбора преподавателя: оба живут через `Controller`. */
    control,
    onSubmit,
    fieldErrors: errors,
    formError,

    coverUrl: cover.url,
    /**
     * Что сказать под рамкой. Отказ сохранения — поверх ошибки загрузки:
     * он про только что нажатое «Сохранить», а ошибка загрузки к этому
     * моменту уже прочитана (то же правило, что у фото карточки ППС).
     */
    coverError: coverRefusal ?? coverUpload.error,
    isUploadingCover: coverUpload.isUploading,
    onCoverSelect: (file: File) => {
      setCoverRefusal(null);
      coverUpload.select(file);
    },

    teachers: teachersQuery.data?.content ?? [],
    /** Имя привязанного преподавателя из самого достижения — подпись, если в списке его не нашлось. */
    currentTeacherName: achievement?.teacherName ?? null,
    isLoadingTeachers: teachersQuery.isLoading,
    hasTeachersFailed: teachersQuery.isError,

    /** Загрузка обложки тоже блокирует отправку: иначе ушёл бы старый ключ. */
    isPending: saveMutation.isPending || coverUpload.isUploading,
  };
}

/**
 * Что показать после отказа. `null` — всё разложено по местам, общий
 * баннер не нужен.
 */
function describeSaveError(
  error: unknown,
  setError: UseFormSetError<AchievementFormValues>,
  setCoverRefusal: (message: string | null) => void,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить достижение. Попробуйте ещё раз.';

  if (error.errors) {
    // Ключ обложки — не поле формы, но место у сообщения есть: под рамкой.
    // Снимается первым, иначе ушёл бы в баннер вдобавок (разбор у `takeFieldErrors`).
    const { taken, rest } = takeFieldErrors(error.errors, ['previewImage'] as const);
    setCoverRefusal(taken.previewImage ?? null);

    const homeless = applyFieldErrors(rest, ACHIEVEMENT_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Остальное — баннером как есть. Сюда приходят два отказа, у которых
   * место на форме есть, а адреса в ответе нет: ключ несуществующего файла
   * (`InvalidFileException`) и ссылка на карточку ППС, удалённую, пока
   * форма была открыта («Преподаватель не найден: id=N»,
   * `InvalidRequestException`). Второй из списка выбрать нельзя вовсе,
   * поэтому заявку на словарь для него заводить незачем. И ещё `404`,
   * сеть, `500`.
   */
  return error.message;
}
