import type { AdminUser } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useUserForm } from './model/useUserForm';
import { UserForm } from './ui/UserForm';

interface UserDialogProps {
  /** Правим существующую учётку; `null` — заводим новую. */
  user: AdminUser | null;
  /** `id` вошедшего админа: свою учётку форма не даёт разжаловать. */
  currentUserId: number | null;
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика вместе — как у конференций.
 * Окном, а не своей страницей: учётка целиком лежит в строке списка,
 * догружать форме нечего.
 */
export function UserDialog({ user, currentUserId, onClose }: UserDialogProps) {
  const form = useUserForm(user, currentUserId, onClose);

  return (
    <Modal
      title={user ? 'Правка учётной записи' : 'Новая учётная запись'}
      onClose={onClose}
      isBusy={form.isPending}
    >
      <UserForm
        register={form.register}
        onSubmit={form.onSubmit}
        onCancel={onClose}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        isNew={form.isNew}
        isSelf={form.isSelf}
        username={user?.username ?? null}
      />
    </Modal>
  );
}
