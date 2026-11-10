import { screen } from '@testing-library/react';
import { GraduationCap } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/render';

import PlannedSectionPage from './index';

/**
 * Заглушка раздела, экран которого ещё не написан.
 *
 * Своим тестом, а не через роутер: с F-47 в `ADMIN_SECTIONS` не осталось
 * ни одного раздела с `plannedIn`, и проверить её на настоящем дереве
 * адресов стало не на чем. Механизм при этом остаётся — разделы следующих
 * фаз (расписания, публикации) встанут в меню им же.
 */
describe('PlannedSectionPage', () => {
  it('называет раздел и тикет, с которым он появится', () => {
    renderWithProviders(
      <PlannedSectionPage
        section={{
          key: 'schedules',
          title: 'Расписания',
          icon: GraduationCap,
          path: '/admin/schedules',
          access: 'moderator',
          plannedIn: 'F-99',
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Расписания' })).toBeInTheDocument();
    expect(screen.getByText('Раздел ещё не сделан')).toBeInTheDocument();
    expect(screen.getByText(/F-99/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ко всем разделам' })).toHaveAttribute('href', '/admin');
  });
});
