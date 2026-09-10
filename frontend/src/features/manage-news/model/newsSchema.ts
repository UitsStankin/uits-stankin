import { z } from 'zod';

import { POST_TYPES } from '@entities/news';
import type { News, NewsRequest } from '@shared/types';

/**
 * Проверки формы записи — ровно те, что на бэкенде (`NewsRequestDto`).
 * Правил сверх серверных нет: форма не должна запрещать то, что сервер
 * разрешает.
 *
 * Нижняя граница у заголовка — единственная во всём API (docs/API.md,
 * «Новости: создание, правка, удаление»), и проверять её на клиенте
 * особенно стоит: отказ по слишком короткому заголовку иначе приходит
 * после отправки всей статьи вместе с картинками.
 */
export const newsSchema = z.object({
  // Два сообщения вместо одного: пустому полю «от 5 символов» ничего
  // не объясняет, а набравшему «Итоги» — объясняет ровно то, что нужно.
  title: z
    .string()
    .trim()
    .min(1, 'Укажите заголовок')
    .min(5, 'Заголовок не короче 5 символов')
    .max(100, 'Не длиннее 100 символов'),

  postType: z.enum(POST_TYPES),

  // Необязательные текстовые поля — строки, а не `string | null`: `''`
  // означает «не заполнено» и превращается в `null` на границе запроса.
  // react-hook-form не умеет отличать пустое поле от нетронутого, и `null`
  // в форме означал бы третье состояние, которого у поля ввода нет.
  shortDescription: z.string().trim().max(255, 'Не длиннее 255 символов'),

  /*
   * Содержание обязательно. Пустое поле редактора приходит сюда пустой
   * строкой, а не `<p></p>`: за это отвечает сам редактор (`isEmptyHtml`
   * в `shared/ui/RichTextEditor`). Без него проверка `min(1)` пропускала бы
   * абзац из ничего, и `400` за него приходил бы от сервера — он считает
   * обязательность по результату чистки HTML.
   */
  content: z.string().min(1, 'Добавьте текст записи'),

  previewImageDescription: z.string().trim().max(256, 'Не длиннее 256 символов'),

  // Признак публикации обязателен по контракту: поле без значения — это
  // `400`, а не «скрыта по умолчанию». У флажка третьего состояния нет,
  // поэтому здесь просто `boolean`.
  display: z.boolean(),
});

export type NewsFormValues = z.infer<typeof newsSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа бэкенда (`shared/lib/formErrors.ts`).
 *
 * `previewImage` в списке нет намеренно, хотя поле такое в контракте есть:
 * в форме оно не поле ввода, а состояние загрузки, и подсветить его
 * `setError` нельзя. Отказ по ключу обложки («Файл обложки не найден»)
 * уйдёт в общий баннер, а не потеряется.
 */
export const NEWS_FIELDS = [
  'title',
  'postType',
  'shortDescription',
  'content',
  'previewImageDescription',
  'display',
] as const;

/**
 * Начальные значения формы: правка существующей записи или новая (`null`).
 *
 * У новой записи тип — «Новость», а публикация включена. И то и другое —
 * умолчания предметной области, а не наши: объявления кафедры пишут реже
 * новостей, а `display` у сущности бэкенда объявлен со значением `true`
 * (`NewsPost.display`). Скрытая по умолчанию запись означала бы, что
 * модератор сохранил статью и не нашёл её на сайте.
 */
export function newsToFormValues(news: News | null): NewsFormValues {
  return {
    title: news?.title ?? '',
    postType: news?.postType ?? 'news',
    shortDescription: news?.shortDescription ?? '',
    content: news?.content ?? '',
    previewImageDescription: news?.previewImageDescription ?? '',
    display: news?.display ?? true,
  };
}

/**
 * Значения формы в тело запроса. Ключ обложки приходит отдельным
 * аргументом: он живёт не в полях формы, а в состоянии загрузки
 * (`useNewsForm`).
 *
 * Описание обложки без самой обложки не отправляется: без картинки оно
 * ничего не описывает, и оставленное от снятой обложки всплыло бы
 * подписью у следующей.
 */
export function formValuesToRequest(values: NewsFormValues, previewImage: string | null): NewsRequest {
  return {
    title: values.title,
    shortDescription: emptyToNull(values.shortDescription),
    postType: values.postType,
    previewImage,
    previewImageDescription:
      previewImage === null ? null : emptyToNull(values.previewImageDescription),
    content: values.content,
    display: values.display,
  };
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
