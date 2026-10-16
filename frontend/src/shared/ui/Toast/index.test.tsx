import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toast, useToastStore } from '@shared/store';

import ToastViewport from './index';

/**
 * Всплывающие сообщения.
 *
 * Таймеры поддельные: настоящие означали бы четыре секунды ожидания
 * в тесте на снятие сообщения — ровно того, ради чего он написан.
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  // Стор — синглтон на весь прогон: оставленное сообщение всплыло бы
  // в соседнем тесте.
  useToastStore.setState({ toasts: [] });
});

describe('ToastViewport', () => {
  it('показывает поднятое сообщение', () => {
    render(<ToastViewport />);

    act(() => toast.success('Дисциплина сохранена'));

    expect(screen.getByText('Дисциплина сохранена')).toBeInTheDocument();
  });

  it('снимает сообщение об успехе через четыре секунды', () => {
    render(<ToastViewport />);

    act(() => toast.success('Дисциплина сохранена'));
    act(() => vi.advanceTimersByTime(4_000));

    expect(screen.queryByText('Дисциплина сохранена')).not.toBeInTheDocument();
  });

  /**
   * Отказ висит дольше успеха, и это не украшение: в нём бывает то, что
   * нужно прочитать целиком. На четвёртой секунде он обязан быть на месте.
   */
  it('держит сообщение об отказе дольше четырёх секунд', () => {
    render(<ToastViewport />);

    act(() => toast.error('Дисциплина назначена преподавателям (3)'));
    act(() => vi.advanceTimersByTime(4_000));

    expect(screen.getByText('Дисциплина назначена преподавателям (3)')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(6_000));

    expect(screen.queryByText('Дисциплина назначена преподавателям (3)')).not.toBeInTheDocument();
  });

  it('закрывается крестиком до срока', () => {
    render(<ToastViewport />);

    act(() => toast.success('Дисциплина сохранена'));
    act(() => screen.getByRole('button', { name: 'Закрыть сообщение' }).click());

    expect(screen.queryByText('Дисциплина сохранена')).not.toBeInTheDocument();
  });

  /**
   * Сторож на таймеры: пока каждый прогон эффекта заводил их заново,
   * второе сообщение продлевало жизнь первому — оба снимались пачкой
   * на своей полной длительности от момента появления ВТОРОГО.
   * Здесь первое обязано уйти строго через свои четыре секунды.
   */
  it('снимает сообщения по очереди, а не пачкой', () => {
    render(<ToastViewport />);

    act(() => toast.success('Первое'));
    act(() => vi.advanceTimersByTime(2_000));
    act(() => toast.success('Второе'));
    act(() => vi.advanceTimersByTime(2_000));

    expect(screen.queryByText('Первое')).not.toBeInTheDocument();
    expect(screen.getByText('Второе')).toBeInTheDocument();
  });

  it('объявляет область живой заранее — до первого сообщения', () => {
    const { container } = render(<ToastViewport />);

    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
  });
});
