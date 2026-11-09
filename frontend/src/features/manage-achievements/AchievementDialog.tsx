import type { Achievement } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useAchievementForm } from './model/useAchievementForm';
import { AchievementForm } from './ui/AchievementForm';

interface AchievementDialogProps {
  /** Правим существующее достижение; `null` — заводим новое. */
  achievement: Achievement | null;
  /** Закрыть окно: и по «Отмене», и после успешного сохранения. */
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика вместе — как у новостей
 * и конференций. Окном-панелью, а не страницей: достижение целиком лежит
 * в строке списка, и форме нечего догружать, кроме списка преподавателей,
 * который нужен ей, а не странице.
 */
export function AchievementDialog({ achievement, onClose }: AchievementDialogProps) {
  const form = useAchievementForm(achievement, onClose);

  return (
    <Modal
      title={achievement ? 'Правка достижения' : 'Новое достижение'}
      onClose={onClose}
      isBusy={form.isPending}
    >
      <AchievementForm
        register={form.register}
        control={form.control}
        onSubmit={form.onSubmit}
        onCancel={onClose}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        coverUrl={form.coverUrl}
        coverError={form.coverError}
        isUploadingCover={form.isUploadingCover}
        onCoverSelect={form.onCoverSelect}
        teachers={form.teachers}
        currentTeacherName={form.currentTeacherName}
        isLoadingTeachers={form.isLoadingTeachers}
        hasTeachersFailed={form.hasTeachersFailed}
      />
    </Modal>
  );
}
