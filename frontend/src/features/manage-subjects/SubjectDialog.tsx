import type { Subject } from '@shared/types';
import Modal from '@shared/ui/Modal';

import { useSubjectForm } from './model/useSubjectForm';
import { SubjectForm } from './ui/SubjectForm';

interface SubjectDialogProps {
  /** Правим существующую дисциплину; `null` — заводим новую. */
  subject: Subject | null;
  /** Закрыть окно: и по «Отмене», и после успешного сохранения. */
  onClose: () => void;
}

/**
 * Сборка фичи: окно, форма и её логика вместе.
 *
 * Отдельным компонентом, а не разметкой на странице, по двум причинам.
 *
 * Первая — «идёт запрос» знает только хук формы, а закрывать окно на это
 * время нельзя (`isBusy` у `Modal`). Собранные в разных местах, окно
 * и форма обменивались бы этим признаком через состояние страницы —
 * то есть держали бы его в двух копиях.
 *
 * Вторая — начальные значения формы берутся при монтировании. Пока окно
 * живёт ровно столько, сколько правится одна дисциплина, «сбросить форму
 * при переходе к другой записи» не нужно вовсе: страница монтирует
 * этот компонент заново.
 *
 * Файл лежит в корне фичи, а не в `ui/`: там только чистые компоненты,
 * а это сборка — то же место, что `index.tsx` у виджета.
 */
export function SubjectDialog({ subject, onClose }: SubjectDialogProps) {
  const form = useSubjectForm(subject, onClose);

  return (
    <Modal
      title={subject ? 'Правка дисциплины' : 'Новая дисциплина'}
      onClose={onClose}
      isBusy={form.isPending}
    >
      <SubjectForm
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
