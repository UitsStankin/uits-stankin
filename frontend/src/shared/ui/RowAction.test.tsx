import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { RowAction, RowActionLink } from './RowAction';

describe('RowAction', () => {
  it('показывает слово на кнопке, а диктору отдаёт имя вместе с записью', () => {
    const onClick = vi.fn();

    render(
      <RowAction
        label="Править дисциплину «Базы данных»"
        text="Править"
        onClick={onClick}
        icon={<svg aria-hidden="true" />}
      />,
    );

    const button = screen.getByRole('button', { name: 'Править дисциплину «Базы данных»' });
    expect(button).toHaveTextContent('Править');
    expect(button).toHaveAttribute('title', 'Править дисциплину «Базы данных»');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('у ссылки то же слово и тот же вид, а адрес остаётся ссылкой', () => {
    render(
      <MemoryRouter>
        <RowActionLink
          label="Править карточку «Иванов Иван»"
          text="Править"
          to="/admin/teachers/3"
          icon={<svg aria-hidden="true" />}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'Править карточку «Иванов Иван»' });
    expect(link).toHaveTextContent('Править');
    expect(link).toHaveAttribute('href', '/admin/teachers/3');
  });
});
