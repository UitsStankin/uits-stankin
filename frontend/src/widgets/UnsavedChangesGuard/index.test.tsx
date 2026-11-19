import { useState } from 'react';
import { Link, Outlet, RouterProvider, createMemoryRouter, useNavigate } from 'react-router';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { hasUnsavedChanges, useUnsavedChanges } from '@shared/lib';

import UnsavedChangesGuard from '.';

/**
 * Форма-заглушка: флажок «есть правка» вместо полей и кнопка «Сохранить»,
 * которая, как настоящие формы, снимает отметку и сразу уводит на список.
 */
function FakeForm() {
  const [isDirty, setDirty] = useState(false);
  const unsaved = useUnsavedChanges(isDirty);
  const navigate = useNavigate();

  return (
    <>
      <label>
        <input type="checkbox" checked={isDirty} onChange={(e) => setDirty(e.target.checked)} />
        Есть правка
      </label>
      <button
        type="button"
        onClick={() => {
          unsaved.release();
          void navigate('/list');
        }}
      >
        Сохранить
      </button>
      <Link to="/list">К списку</Link>
      <Link to="/form?tab=2">Вторая вкладка</Link>
    </>
  );
}

/** Лейаут как у приложения: сторож рядом с содержимым страницы. */
function Layout() {
  return (
    <>
      <Outlet />
      <UnsavedChangesGuard />
    </>
  );
}

function renderGuarded() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <Layout />,
        children: [
          { path: 'form', element: <FakeForm /> },
          { path: 'list', element: <h1>Список</h1> },
        ],
      },
    ],
    { initialEntries: ['/form'] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

const markDirty = () => fireEvent.click(screen.getByRole('checkbox', { name: 'Есть правка' }));

function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  act(() => {
    window.dispatchEvent(event);
  });
  return event.defaultPrevented;
}

describe('UnsavedChangesGuard', () => {
  it('без правки уходит без вопроса', () => {
    renderGuarded();

    fireEvent.click(screen.getByRole('link', { name: 'К списку' }));

    expect(screen.getByRole('heading', { name: 'Список' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('с правкой спрашивает; «Отмена» оставляет на форме, правка цела', () => {
    renderGuarded();
    markDirty();

    fireEvent.click(screen.getByRole('link', { name: 'К списку' }));

    expect(screen.getByRole('dialog', { name: 'Уйти без сохранения?' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Есть правка' })).toBeChecked();
  });

  it('«Уйти» уводит, и отметка снимается вместе с формой', () => {
    renderGuarded();
    markDirty();

    fireEvent.click(screen.getByRole('link', { name: 'К списку' }));
    fireEvent.click(screen.getByRole('button', { name: 'Уйти' }));

    expect(screen.getByRole('heading', { name: 'Список' })).toBeInTheDocument();
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('после сохранения уводит без вопроса — форма ещё «грязная», но отметку сняла', () => {
    renderGuarded();
    markDirty();

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(screen.getByRole('heading', { name: 'Список' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('смена одних параметров адреса форму не размонтирует — и не спрашивает', () => {
    const router = renderGuarded();
    markDirty();

    fireEvent.click(screen.getByRole('link', { name: 'Вторая вкладка' }));

    expect(router.state.location.search).toBe('?tab=2');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('закрытие вкладки задерживается только при несохранённом', () => {
    renderGuarded();

    expect(fireBeforeUnload()).toBe(false);

    markDirty();
    expect(fireBeforeUnload()).toBe(true);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Есть правка' }));
    expect(fireBeforeUnload()).toBe(false);
  });
});
