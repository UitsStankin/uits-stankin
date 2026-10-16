import type { Helper } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useHelperForm } from './model/useHelperForm';
import { HelperForm } from './ui/HelperForm';

interface HelperDialogProps {
  /** Правим существующую карточку; `null` — заводим новую. */
  helper: Helper | null;
  /** Закрыть окно: и по «Отмене», и после успешного сохранения. */
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика вместе. Собрано так же, как окна
 * дисциплины и новости, и по тем же двум причинам.
 *
 * Первая — «идёт запрос» знает только хук формы, а закрывать окно на это
 * время нельзя (`isBusy` у `Modal`). Собранные в разных местах, окно
 * и форма обменивались бы этим признаком через состояние страницы —
 * то есть держали бы его в двух копиях.
 *
 * Вторая — начальные значения формы берутся при монтировании. Пока окно
 * живёт ровно столько, сколько правится одна карточка, «сбросить форму
 * при переходе к другой» не нужно вовсе: страница монтирует этот
 * компонент заново.
 *
 * Окно, а не своя страница, как у карточки ППС: там форме нужен свой
 * запрос за полной карточкой, здесь догружать нечего — вся карточка УВП
 * лежит в строке списка.
 *
 * Файл лежит в корне фичи, а не в `ui/`: там только чистые компоненты,
 * а это сборка — то же место, что `index.tsx` у виджета.
 */
export function HelperDialog({ helper, onClose }: HelperDialogProps) {
  const form = useHelperForm(helper, onClose);

  return (
    <Modal
      title={helper ? 'Правка карточки' : 'Новая карточка'}
      onClose={onClose}
      isBusy={form.isPending}
    >
      <HelperForm
        register={form.register}
        onSubmit={form.onSubmit}
        onCancel={onClose}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        avatarPreviewUrl={form.avatarPreviewUrl}
        avatarError={form.avatarError}
        isUploadingAvatar={form.isUploadingAvatar}
        onAvatarSelect={form.onAvatarSelect}
        onAvatarRemove={form.onAvatarRemove}
        submitLabel={helper ? 'Сохранить' : 'Создать'}
      />
    </Modal>
  );
}
