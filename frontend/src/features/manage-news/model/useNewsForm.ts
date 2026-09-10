import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormSetError } from 'react-hook-form';

import { newsKeys } from '@entities/news';
import { isApiError, useImageUpload } from '@shared/api';
import { applyFieldErrors } from '@shared/lib';
import { toast } from '@shared/store';
import type { News } from '@shared/types';

import { createNews, updateNews } from '../api/newsAdminApi';
import {
  NEWS_FIELDS,
  formValuesToRequest,
  newsSchema,
  newsToFormValues,
  type NewsFormValues,
} from './newsSchema';

/** Что показывать в рамке предпросмотра и что отправлять в `previewImage`. */
type Cover = {
  /** Ключ файла — то, что уедет в запрос. `null` — обложки нет. */
  key: string | null;
  /** Адрес для показа. Собирает его сервер, не мы. */
  url: string | null;
};

/**
 * Форма записи: проверка полей, загрузка обложки, запрос, разбор отказа.
 *
 * `news` — правим существующую; `null` — заводим новую. Одна форма на оба
 * случая, потому что поля и проверки у них одни и те же, а тела запросов
 * `POST` и `PUT` в контракте совпадают побайтово.
 *
 * Компонент с этим хуком монтируется на время правки и размонтируется
 * по «Отмене» — так «начальные значения» и «брошенные правки» не требуют
 * ручного сброса.
 *
 * **Обложка не поле формы, а отдельное состояние** — как фото в карточке
 * ППС: файл уходит на сервер сразу при выборе (`POST /api/files`, раздел
 * `news`), а в форме остаётся ключ из ответа. Предпросмотр — тоже из ответа:
 * сервер картинку перекодирует и ужимает, показывать локальный файл значило
 * бы показывать не то, что сохранится.
 */
export function useNewsForm(news: News | null, onSaved: () => void) {
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsSchema),
    defaultValues: newsToFormValues(news),
  });

  /** Отказ, который не лёг ни на одно поле: сеть, `500`, негодный ключ обложки. */
  const [formError, setFormError] = useState<string | null>(null);

  const [cover, setCover] = useState<Cover>({
    key: news?.previewImage ?? null,
    url: news?.previewImageUrl ?? null,
  });

  const coverUpload = useImageUpload('news', (uploaded) =>
    setCover({ key: uploaded.key, url: uploaded.url }),
  );

  const saveMutation = useMutation({
    mutationFn: (values: NewsFormValues) => {
      const body = formValuesToRequest(values, cover.key);

      return news ? updateNews(news.id, body) : createNews(body);
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);

    saveMutation.mutate(values, {
      onSuccess: (saved) => {
        /*
         * Сбрасывается **весь** кэш новостей, а не только админский список:
         * правка одной записи меняет и его, и публичную ленту, и открытую
         * статью, и обе секции главной. Ради этого выбора в сущности
         * и заведена иерархия ключей (`entities/news/api/newsQueries.ts`).
         *
         * Инвалидация, а не подстановка ответа в кэш, как у карточки ППС:
         * там ключ один и известен, здесь ответ — одна запись, а в кэше
         * лежат страницы списков, и место новой записи в них зависит
         * от порядка, фильтра и того, сколько записей перед ней. Вычислять
         * это на клиенте значило бы повторять запрос Spring.
         */
        void queryClient.invalidateQueries({ queryKey: newsKeys.all });

        toast.success(news ? `Запись «${saved.title}» сохранена` : `Запись «${saved.title}» создана`);
        onSaved();
      },
      onError: (error) => setFormError(describeSaveError(error, setError)),
    });
  });

  return {
    register,
    /**
     * Для поля, которое не является элементом ввода: rich-text редактор
     * отдаёт строку HTML, а `register` цепляется к `onChange` DOM-элемента,
     * которого у `contenteditable` нет.
     */
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
     * Снять обложку. Отправленный `previewImage: null` не просто забывает
     * ключ — бэкенд удаляет файл с диска (docs/API.md, «Обложка новости»),
     * поэтому «убрать» здесь означает именно убрать, а не спрятать.
     */
    onCoverRemove: () => {
      setCover({ key: null, url: null });
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
function describeSaveError(error: unknown, setError: UseFormSetError<NewsFormValues>): string | null {
  // До формы доезжает только ApiError — интерцептор приводит к нему всё.
  if (!isApiError(error)) return 'Не удалось сохранить запись. Попробуйте ещё раз.';

  // Словарь от `@Valid`: имена в нём — имена полей формы.
  if (error.errors) {
    const homeless = applyFieldErrors(error.errors, NEWS_FIELDS, setError);

    return homeless.length > 0 ? homeless.join(' ') : null;
  }

  /*
   * Остальное — в баннер как есть: `400` без словаря (ключ обложки,
   * которого нет в хранилище, — в том числе пролежавший в открытой форме
   * дольше суток и убранный уборщиком сирот), `404` (запись удалили, пока
   * форма была открыта), сеть, `500`. Текст ApiError пригоден для показа.
   */
  return error.message;
}
