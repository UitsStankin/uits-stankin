import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useAppStore, useThemeStore } from '@shared/store';
import { renderWithProviders } from '@/test/render';

import Header from './index';

afterEach(() => {
  useAppStore.getState().closeMenu();
  useThemeStore.setState({ theme: 'light' });
  localStorage.clear();
});

describe('Header', () => {
  it('открывает лист меню со всеми разделами и закрывает его по Escape', () => {
    renderWithProviders(<Header />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }));

    const sheet = screen.getByRole('dialog', { name: 'Разделы сайта' });
    expect(within(sheet).getByRole('tab', { name: 'О кафедре', selected: true })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: 'История кафедры' })).toHaveAttribute(
      'href',
      '/about/history-of-department',
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('показывает ссылки одного раздела и переключается между разделами', () => {
    renderWithProviders(<Header />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }));
    const sheet = screen.getByRole('dialog', { name: 'Разделы сайта' });

    expect(within(sheet).queryByRole('link', { name: 'Аспирантура' })).not.toBeInTheDocument();

    fireEvent.click(within(sheet).getByRole('tab', { name: 'Научная деятельность' }));

    expect(within(sheet).getByRole('link', { name: 'Аспирантура' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('link', { name: 'История кафедры' })).not.toBeInTheDocument();
  });

  it('закрывает лист меню кнопкой и возвращает фокус на кнопку меню', () => {
    renderWithProviders(<Header />);

    const opener = screen.getByRole('button', { name: 'Открыть меню' });
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Закрыть меню' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('гостю предлагает вход и в шапке, и внизу листа меню', () => {
    renderWithProviders(<Header />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть меню' }));

    expect(screen.getAllByRole('link', { name: 'Вход для персонала' })).toHaveLength(2);
  });

  it('показывает переключатель темы только когда он включён', () => {
    const { unmount } = renderWithProviders(<Header />);
    expect(screen.queryByRole('button', { name: /тему/ })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<Header showThemeToggle />);
    expect(screen.getByRole('button', { name: 'Включить тёмную тему' })).toBeInTheDocument();
  });

  it('переключает тему и запоминает выбор', () => {
    renderWithProviders(<Header showThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Включить тёмную тему' }));

    expect(screen.getByRole('button', { name: 'Включить светлую тему' })).toBeInTheDocument();
    expect(localStorage.getItem('uits-theme')).toBe('dark');
  });
});
