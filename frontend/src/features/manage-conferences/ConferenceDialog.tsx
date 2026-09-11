import type { Conference } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useConferenceForm } from './model/useConferenceForm';
import { ConferenceForm } from './ui/ConferenceForm';

interface ConferenceDialogProps {
  /** Правим существующее объявление; `null` — заводим новое. */
  conference: Conference | null;
  /** Закрыть окно: и по «Отмене», и после успешного сохранения. */
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика вместе — как у новостей
 * (`features/manage-news/NewsDialog.tsx`), и по тем же причинам: «идёт
 * запрос» знает только хук формы, а начальные значения берутся
 * при монтировании.
 *
 * Окном-панелью, а не своей страницей, как у карточки ППС: объявление
 * целиком лежит в строке списка — списочная и детальная ручки отдают
 * один DTO, — и форме нечего догружать.
 */
export function ConferenceDialog({ conference, onClose }: ConferenceDialogProps) {
  const form = useConferenceForm(conference, onClose);

  return (
    <Modal
      title={conference ? 'Правка конференции' : 'Новая конференция'}
      onClose={onClose}
      isBusy={form.isPending}
    >
      <ConferenceForm
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
