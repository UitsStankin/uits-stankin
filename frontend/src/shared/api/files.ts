import type { FileCategory, FileUploadResponse } from '@shared/types';

import { api } from './client';

/**
 * Загрузка файла — `POST /api/files`, единая ручка для аватаров, обложек
 * и картинок rich-text (docs/API.md, «Загрузка файлов»).
 *
 * Живёт в `shared/api`, а не в фиче: первым потребителем стала правка
 * карточки ППС (F-16), но та же функция нужна правке профиля (F-27)
 * и формам админки (F-42) — у загрузки нет логики конкретной формы,
 * только транспорт.
 *
 * Файл уходит **до** сохранения сущности: в ответе `key` — то, что форма
 * положит в своё поле (`avatar`, `previewImage`), и `url` — готовый адрес
 * для предпросмотра. Собирать одно из другого нельзя ни в какую сторону:
 * правило сборки принадлежит бэкенду.
 *
 * Сервер принимает только JPEG и PNG до 15 МБ, формат определяет
 * по содержимому, картинку перекодирует (EXIF стирается, длинная сторона
 * ужимается до 1600px) — поэтому предпросмотр честнее показывать по `url`
 * из ответа, а не из локального файла.
 *
 * `Content-Type` не задаётся руками: axios сам ставит `multipart/form-data`
 * с граничником из `FormData`, а заданный вручную остался бы без граничника.
 */
export async function uploadFile(file: File, category: FileCategory): Promise<FileUploadResponse> {
  const body = new FormData();
  body.append('file', file);
  body.append('category', category);

  const { data } = await api.post<FileUploadResponse>('/api/files', body);
  return data;
}
