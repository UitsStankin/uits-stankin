import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FormSection } from './FormFields';
import { FormActions } from './FormActions';

describe('FormActions', () => {
  it('показывает «Сохранить» и «Отмена» и зовёт отмену по клику', () => {
    const onCancel = vi.fn();

    render(<FormActions isPending={false} onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: 'Сохранить' })).toHaveAttribute('type', 'submit');

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('берёт подпись отправки из пропса', () => {
    render(<FormActions isPending={false} onCancel={() => {}} submitLabel="Создать" />);

    expect(screen.getByRole('button', { name: 'Создать' })).toBeInTheDocument();
  });

  it('пока идёт запрос, блокирует обе кнопки и говорит, что сохраняет', () => {
    render(<FormActions isPending onCancel={() => {}} />);

    expect(screen.getByRole('button', { name: 'Сохраняем…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Отмена' })).toBeDisabled();
  });
});

describe('FormSection', () => {
  it('называет группу полей по заголовку', () => {
    render(
      <FormSection title="Контакты">
        <input aria-label="Телефон" />
      </FormSection>,
    );

    const section = screen.getByRole('region', { name: 'Контакты' });
    expect(section).toContainElement(screen.getByLabelText('Телефон'));
    expect(screen.getByRole('heading', { name: 'Контакты' })).toBeInTheDocument();
  });
});
