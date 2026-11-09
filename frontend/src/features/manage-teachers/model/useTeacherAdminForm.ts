import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { subjectsListQuery } from '@entities/subject';
import { teacherKeys } from '@entities/teacher';
import { userDirectoryQuery } from '@entities/user';
import { isApiError, useImageUpload } from '@shared/api';
import { applyFieldErrors, takeFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { Teacher } from '@shared/types';

import { createTeacher, updateTeacher } from '../api/teacherCardApi';
import {
  TEACHER_CARD_FIELDS,
  formValuesToAdminRequest,
  teacherCardSchema,
  teacherToFormValues,
  type TeacherCardFormValues,
} from './teacherCardSchema';

/**
 * Словарь дисциплин просится целиком, а не постранично: это набор
 * флажков, а не список. Сотня — потолок контракта (`size` урезается
 * до неё молча), и дисциплин у кафедры заведомо меньше.
 */
const SUBJECTS_QUERY = subjectsListQuery({ size: 100 });

/**
 * Поля, у которых есть адрес в ответе, но нет места в react-hook-form.
 *
 * Ровно три, и все три названы контрактом (docs/API.md, «Создание
 * и правка карточек»): занятая или негодная учётная запись — `userId`,
 * неизвестная дисциплина — `subjectIds`, ключ несуществующего файла —
 * `avatar`. Больше ключей у этих ручек не бывает: отказы приходят
 * по одному.
 */
const FIELDS_OUTSIDE_FORM = ['userId', 'subjectIds', 'avatar'] as const;

type ServerFieldErrors = Partial<Record<(typeof FIELDS_OUTSIDE_FORM)[number], string>>;

/** Пустая карточка для формы создания: те же поля, все незаполненные. */
const BLANK_CARD: Teacher = {
  id: 0,
  userId: null,
  lastName: '',
  firstName: '',
  patronymic: null,
  position: '',
  degree: null,
  rank: null,
  avatar: null,
  avatarUrl: null,
  phoneNumber: null,
  email: null,
  messenger: null,
  experience: null,
  professionalExperience: null,
  education: null,
  qualification: null,
  bio: null,
  examScheduleGraduation: null,
  examScheduleNonGraduation: null,
  subjects: [],
};

/**
 * Форма карточки ППС у модератора: проверка полей, фото, дисциплины,
 * связь с учётной записью, запрос, разбор отказа.
 *
 * `card` — правим существующую; `null` — заводим новую. Одна форма
 * на оба случая: поля и проверки у них одни и те же, а тела `POST`
 * и `PUT` в контракте совпадают побайтово.
 *
 * **Три вещи живут не в react-hook-form, а рядом с ней** — ключ фото,
 * отмеченные дисциплины и выбранная учётка. У всех трёх одна причина:
 * это не поля ввода. Фото уходит на сервер до отправки формы и оставляет
 * после себя ключ; дисциплины — набор флажков; учётка — выпадающий список,
 * отказ по которому приходит без словаря `errors`, то есть подсветить
 * поле всё равно нечем. Регистрация их в форме дала бы схему на три
 * поля длиннее и ни одной новой проверки.
 *
 * Словарь дисциплин и справочник учёток запрашиваются здесь, а не
 * страницей: без них форма неполна, а странице списка они не нужны вовсе.
 */
export function useTeacherAdminForm(card: Teacher | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TeacherCardFormValues>({
    resolver: zodResolver(teacherCardSchema),
    defaultValues: teacherToFormValues(card ?? BLANK_CARD),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, `404`. */
  const [formError, setFormError] = useState<string | null>(null);

  /**
   * Отказы сервера по трём полям, которые живут вне react-hook-form.
   *
   * Своим состоянием, потому что `setError` на них не наведёшь. Чистятся
   * там же, где react-hook-form чистит свои серверные ошибки, — при
   * правке самого поля: сообщение «Учётная запись уже связана
   * с карточкой id=3» после выбора другой учётки перестаёт быть правдой,
   * а висело бы до следующей отправки.
   */
  const [fieldErrors, setFieldErrors] = useState<ServerFieldErrors>({});

  const clearFieldError = (field: keyof ServerFieldErrors) =>
    setFieldErrors((current) => ({ ...current, [field]: undefined }));

  /** Ключ и адрес фото: ключ уедет в запрос, адрес — в предпросмотр. */
  const [avatar, setAvatar] = useState({
    key: card?.avatar ?? null,
    url: card?.avatarUrl ?? null,
  });

  const [subjectIds, setSubjectIds] = useState<readonly number[]>(
    () => card?.subjects.map((subject) => subject.id) ?? [],
  );

  const [userId, setUserId] = useState<number | null>(card?.userId ?? null);

  const avatarUpload = useImageUpload('avatars', (uploaded) =>
    setAvatar({ key: uploaded.key, url: uploaded.url }),
  );

  const subjectsQuery = useQuery(SUBJECTS_QUERY);
  const accountsQuery = useQuery(userDirectoryQuery);

  const saveMutation = useMutation({
    mutationFn: (values: TeacherCardFormValues) => {
      const body = formValuesToAdminRequest(values, avatar.key, userId, [...subjectIds]);

      return card ? updateTeacher(card.id, body) : createTeacher(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    setFieldErrors({});

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        /*
         * Сбрасывается **вся** ветка преподавателей, а не только список:
         * правка карточки меняет и раздел админки, и публичный список,
         * и открытую карточку — включая свою, если правили её владельца.
         * Ради такого выбора в сущности и заведена иерархия ключей.
         */
        void queryClient.invalidateQueries({ queryKey: teacherKeys.all });

        toast.success(
          card
            ? `Карточка «${saved.lastName} ${saved.firstName}» сохранена`
            : `Карточка «${saved.lastName} ${saved.firstName}» создана`,
        );
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError, setFieldErrors)),
    });
  });

  return {
    register,
    /** Для rich-text полей: они не элементы ввода и живут через `Controller`. */
    control,
    onSubmit,
    fieldErrors: errors,
    formError,

    avatarPreviewUrl: avatar.url,
    /**
     * Что сказать под рамкой фото. Отказ сохранения показывается поверх
     * ошибки загрузки: он про последнее действие человека — только что
     * нажатое «Сохранить», — а ошибка загрузки к этому моменту уже
     * прочитана. Снимается он выбором нового файла, то есть ровно
     * тогда, когда снова становится актуальной ошибка загрузки.
     */
    avatarError: fieldErrors.avatar ?? avatarUpload.error,
    isUploadingAvatar: avatarUpload.isUploading,
    onAvatarSelect: (file: File) => {
      clearFieldError('avatar');
      avatarUpload.select(file);
    },
    /**
     * Снять фото. Отправленный `avatar: null` не просто забывает ключ —
     * бэкенд удаляет файл с диска, поэтому «убрать» здесь означает именно
     * убрать. У модератора кнопка есть, у преподавателя в кабинете нет:
     * там это решение о своём лице на публичной странице, здесь — работа
     * с чужой карточкой, и снять фото уволившегося сотрудника надо уметь.
     */
    onAvatarRemove: () => {
      setAvatar({ key: null, url: null });
      avatarUpload.clearError();
      clearFieldError('avatar');
    },

    subjects: subjectsQuery.data?.content ?? [],
    subjectIds,
    onSubjectToggle: (id: number) => {
      clearFieldError('subjectIds');
      setSubjectIds((current) =>
        current.includes(id) ? current.filter((each) => each !== id) : [...current, id],
      );
    },
    isLoadingSubjects: subjectsQuery.isLoading,
    /** Отказ сохранения поверх несостоявшейся загрузки — как у фото. */
    subjectsError:
      fieldErrors.subjectIds ??
      (subjectsQuery.isError ? 'Не удалось загрузить словарь дисциплин' : null),

    accounts: accountsQuery.data?.content ?? [],
    userId,
    onUserIdChange: (next: number | null) => {
      clearFieldError('userId');
      setUserId(next);
    },
    isLoadingAccounts: accountsQuery.isLoading,
    accountsError:
      fieldErrors.userId ??
      (accountsQuery.isError ? 'Не удалось загрузить справочник учётных записей' : null),
    /**
     * Справочник не доехал — отдельным признаком, а не по тексту ошибки:
     * от него зависит, заперт ли выбор, а место под сообщением может
     * занять отказ сохранения.
     */
    hasAccountsFailed: accountsQuery.isError,

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
  setError: UseFormSetError<TeacherCardFormValues>,
  setFieldErrors: (errors: ServerFieldErrors) => void,
): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить карточку. Попробуйте ещё раз.';

  if (error.errors) {
    /*
     * Словарь раскладывается в два приёма, и порядок важен.
     *
     * Сначала снимаются три поля, живущие вне формы: учётная запись,
     * дисциплины и ключ фото. Оставь их общему разбору — они уехали бы
     * в «бездомные» и показались бы баннером **вдобавок** к сообщению
     * под собой, потому что `detail` повторяет текст дословно.
     *
     * Остальное — имена полей `TeacherRequestDto`, они же имена полей
     * формы, и их кладёт react-hook-form.
     */
    const { taken, rest } = takeFieldErrors(error.errors, FIELDS_OUTSIDE_FORM);
    setFieldErrors(taken);

    const homeless = applyFieldErrors(rest, TEACHER_CARD_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Остальное — в баннер как есть: `404` (карточку удалили, пока форма
   * была открыта), сеть, `500`. Текст ApiError пригоден для показа.
   *
   * Отказы по учётной записи, дисциплинам и ключу фото сюда больше
   * не попадают: до T-81 (2026-09-10) они приходили от сервиса одним
   * `detail`, и показать их можно было только здесь; заявка **B-7**
   * закрыта, и теперь у каждого есть адрес.
   */
  return error.message;
}
