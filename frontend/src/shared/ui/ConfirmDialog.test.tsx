import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ConfirmDialog from './ConfirmDialog';

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      title="Удалить дисциплину?"
      description="Дисциплина «Базы данных» будет удалена без возможности вернуть."
      confirmLabel="Удалить"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );

  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('показывает, что именно произойдёт', () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Удалить дисциплину?' })).toBeInTheDocument();
    expect(
      screen.getByText('Дисциплина «Базы данных» будет удалена без возможности вернуть.'),
    ).toBeInTheDocument();
  });

  /** Подпись кнопки — действие, а не «ОК»: из «ОК» не видно, что подтверждаешь. */
  it('подтверждает действие кнопкой с его названием', () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('отменяется кнопкой «Отмена»', () => {
    const { onCancel } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  /**
   * Пока идёт удаление, обе кнопки заблокированы: второй клик по «Удалить»
   * отправил бы второй `DELETE`, и он ответил бы `404` на уже удалённую
   * запись — то есть успешное удаление показалось бы сбоем.
   */
  it('блокирует кнопки на время запроса', () => {
    const { onConfirm } = renderDialog({ isPending: true });

    const confirm = screen.getByRole('button', { name: 'Удаляем…' });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();

    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
