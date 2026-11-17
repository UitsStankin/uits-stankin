import type { UserEvent } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useEventForm } from './model/useEventForm';
import { EventForm } from './ui/EventForm';

interface EventDialogProps {
  /** Правим существующее событие; `null` — заводим новое. */
  event: UserEvent | null;
  /** День нового события. У правки не используется. */
  day: Date;
  /** Закрыть окно: и по «Отмене», и после сохранения. */
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика — как у конференций
 * (`features/manage-conferences/ConferenceDialog.tsx`). Начальные
 * значения берутся при монтировании, поэтому окно монтируется только
 * на время правки.
 *
 * Панелью справа, как карточка события: календарь остаётся виден рядом.
 */
export function EventDialog({ event, day, onClose }: EventDialogProps) {
  const form = useEventForm(event, day, onClose);

  return (
    <Modal title={event ? 'Правка события' : 'Новое событие'} onClose={onClose} isBusy={form.isPending}>
      <EventForm
        register={form.register}
        control={form.control}
        onSubmit={form.onSubmit}
        onCancel={onClose}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        allDay={form.allDay}
        accounts={form.accounts}
        knownAssignees={form.knownAssignees}
        isDirectoryLoading={form.isDirectoryLoading}
        hasDirectoryFailed={form.hasDirectoryFailed}
        replacedColor={form.replacedColor}
        submitLabel={event ? 'Сохранить' : 'Создать'}
      />
    </Modal>
  );
}
