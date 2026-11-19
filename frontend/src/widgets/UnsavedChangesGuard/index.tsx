import ConfirmDialog from '@shared/ui/ConfirmDialog';

import { useLeaveGuard } from './model/useLeaveGuard';

/**
 * Вопрос «уйти без сохранения?» на всё приложение (D-F17).
 *
 * Один на лейаут, а не по одному у каждой формы: роутер держит один
 * блокировщик переходов. Формы только отмечают несохранённое
 * (`useUnsavedChanges` из `shared/lib`), а спрашивает этот виджет.
 *
 * Старый портал спрашивал так же — `beforeunload` у редактируемой
 * страницы, — но только при закрытии вкладки и только на одной форме.
 */
export default function UnsavedChangesGuard() {
  const { isAsking, stay, leave } = useLeaveGuard();

  if (!isAsking) return null;

  return (
    <ConfirmDialog
      title="Уйти без сохранения?"
      description="Изменения в форме не сохранены и пропадут."
      confirmLabel="Уйти"
      onConfirm={leave}
      onCancel={stay}
    />
  );
}
