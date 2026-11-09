import type { AdminUser } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useResetPasswordForm } from './model/useResetPasswordForm';
import { ResetPasswordForm } from './ui/ResetPasswordForm';

interface ResetPasswordDialogProps {
  user: AdminUser;
  onClose: () => void;
}

/** Окно сброса пароля: своя форма с одним паролем и повтором. */
export function ResetPasswordDialog({ user, onClose }: ResetPasswordDialogProps) {
  const form = useResetPasswordForm(user, onClose);

  return (
    <Modal title={`Новый пароль для «${user.username}»`} onClose={onClose} isBusy={form.isPending}>
      <ResetPasswordForm
        register={form.register}
        onSubmit={form.onSubmit}
        onCancel={onClose}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
      />
    </Modal>
  );
}
