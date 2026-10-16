import type { News } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useNewsForm } from './model/useNewsForm';
import { NewsForm } from './ui/NewsForm';

interface NewsDialogProps {
  /** Правим существующую запись; `null` — заводим новую. */
  news: News | null;
  /** Закрыть окно: и по «Отмене», и после успешного сохранения. */
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика вместе. Собрано так же, как
 * окно дисциплины (`features/manage-subjects`), и по тем же двум причинам.
 *
 * Первая — «идёт запрос» знает только хук формы, а закрывать окно на это
 * время нельзя (`isBusy` у `Modal`). Собранные в разных местах, окно
 * и форма обменивались бы этим признаком через состояние страницы —
 * то есть держали бы его в двух копиях.
 *
 * Вторая — начальные значения формы берутся при монтировании. Пока окно
 * живёт ровно столько, сколько правится одна запись, «сбросить форму при
 * переходе к другой» не нужно вовсе: страница монтирует этот компонент
 * заново.
 *
 * Файл лежит в корне фичи, а не в `ui/`: там только чистые компоненты,
 * а это сборка — то же место, что `index.tsx` у виджета.
 */
export function NewsDialog({ news, onClose }: NewsDialogProps) {
  const form = useNewsForm(news, onClose);

  return (
    <Modal title={news ? 'Правка записи' : 'Новая запись'} onClose={onClose} isBusy={form.isPending}>
      <NewsForm
        register={form.register}
        control={form.control}
        onSubmit={form.onSubmit}
        onCancel={onClose}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        coverUrl={form.coverUrl}
        hasCover={form.hasCover}
        coverError={form.coverError}
        isUploadingCover={form.isUploadingCover}
        onCoverSelect={form.onCoverSelect}
        onCoverRemove={form.onCoverRemove}
      />
    </Modal>
  );
}
