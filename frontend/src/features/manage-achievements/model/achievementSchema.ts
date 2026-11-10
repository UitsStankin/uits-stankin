import { z } from 'zod';

import type { Achievement, AchievementRequest } from '@shared/types';

/**
 * Проверки формы достижения — ровно те, что на бэкенде
 * (`AchievementRequestDto`). Правил сверх серверных нет.
 *
 * Обязательного здесь больше, чем у новости и конференции: краткое
 * описание, содержание и обложка. Обложки в схеме нет — это не поле ввода,
 * а состояние загрузки, — и её пустота проверяется рядом, в хуке формы,
 * тем же нажатием «Сохранить» (`useAchievementForm`).
 */
export const achievementSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название').max(100, 'Не длиннее 100 символов'),

  // Плоский текст карточки в разделе; длиной не ограничен, но обязателен.
  description: z.string().trim().min(1, 'Добавьте краткое описание'),

  /*
   * Содержание обязательно. Пустое поле редактора приходит пустой строкой,
   * а не `<p></p>` (`isEmptyHtml` в `shared/ui/RichTextEditor`), и проверка
   * `min(1)` его ловит. Текст, от которого после чистки HTML ничего
   * не осталось, поймает только сервер — словарём `errors` по `content`.
   */
  content: z.string().min(1, 'Добавьте текст достижения'),

  /**
   * Карточка ППС, к которой привязано достижение; `null` — кафедральное.
   * Число, а не строка выпадающего списка: поле живёт через `Controller`,
   * и «пустой пункт — это `null`» переводит сам список (`TeacherSelect` из `entities/teacher`).
   */
  teacherId: z.number().nullable(),

  // Признак публикации обязателен по контракту: тело без него — `400`.
  display: z.boolean(),
});

export type AchievementFormValues = z.infer<typeof achievementSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа бэкенда.
 *
 * `previewImage` здесь нет: в форме это состояние загрузки, и его отказ
 * снимается со словаря отдельно и встаёт под рамку обложки
 * (`useAchievementForm`).
 */
export const ACHIEVEMENT_FIELDS = ['title', 'description', 'content', 'teacherId', 'display'] as const;

/**
 * Начальные значения формы: правка существующего достижения или новое
 * (`null`).
 *
 * **Новое достижение заводится черновиком**, и это не расхождение
 * с новостями и конференциями, а то же правило, что у них: умолчание
 * берётся из предметной области. У новости и конференции сущность бэкенда
 * объявляет `display = true`, у достижения — `false`
 * (`Achievement.display`), и так же было в старой модели
 * (`is_published`, `default=False`). Награду кафедра выкладывает, когда
 * она подтверждена, а не когда о ней написали.
 */
export function achievementToFormValues(achievement: Achievement | null): AchievementFormValues {
  return {
    title: achievement?.title ?? '',
    description: achievement?.description ?? '',
    content: achievement?.content ?? '',
    teacherId: achievement?.teacherId ?? null,
    display: achievement?.display ?? false,
  };
}

/**
 * Значения формы в тело запроса. Ключ обложки приходит отдельным
 * аргументом и уже непустым: форма без обложки до запроса не доходит.
 */
export function formValuesToRequest(
  values: AchievementFormValues,
  previewImage: string,
): AchievementRequest {
  return {
    title: values.title,
    description: values.description,
    content: values.content,
    previewImage,
    display: values.display,
    teacherId: values.teacherId,
  };
}
