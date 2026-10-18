import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import Footer from './index';

describe('Footer', () => {
  it('раскладывает ссылки по трём разделам', () => {
    renderWithProviders(<Footer />);

    for (const title of ['О кафедре', 'Обучение', 'Наука']) {
      expect(screen.getByRole('navigation', { name: title })).toBeInTheDocument();
    }

    const about = screen.getByRole('navigation', { name: 'О кафедре' });
    expect(within(about).getByRole('link', { name: 'Контакты' })).toHaveAttribute(
      'href',
      '/about/contacts',
    );
  });

  it('ведёт на чат кафедры и сайт университета в новой вкладке', () => {
    renderWithProviders(<Footer />);

    for (const name of ['Чат кафедры', 'Сайт университета']) {
      const link = screen.getByRole('link', { name });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    }
  });

  it('пишет текущий год', () => {
    renderWithProviders(<Footer />);

    expect(screen.getByText(new RegExp(String(new Date().getFullYear())))).toBeInTheDocument();
  });
});
