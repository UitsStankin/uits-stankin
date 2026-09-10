import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Modal from './index';

function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();

  const view = render(
    <Modal title="Новая дисциплина" onClose={onClose} {...props}>
      <input aria-label="Название" />
      <button type="button">Сохранить</button>
    </Modal>,
  );

  return { ...view, onClose };
}

/** Подложка: единственный элемент, спрятанный от диктора и лежащий поверх страницы. */
function backdrop() {
  const element = document.querySelector('[aria-hidden="true"].absolute');
  expect(element).not.toBeNull();

  return element as Element;
}

describe('Modal', () => {
  it('объявляет себя диалогом с заголовком', () => {
    renderModal();

    expect(screen.getByRole('dialog', { name: 'Новая дисциплина' })).toBeInTheDocument();
  });

  /**
   * Фокус переносится внутрь: без этого табуляция продолжилась бы
   * по странице ЗА окном, и первое поле формы пришлось бы искать вслепую.
   */
  it('ставит фокус на первое поле формы', () => {
    renderModal();

    expect(screen.getByLabelText('Название')).toHaveFocus();
  });

  /**
   * И возвращается туда, откуда пришли: форму открывают кнопкой в строке
   * таблицы, и без возврата фокус после закрытия оказывается в начале
   * документа — на двадцатой строке это заметно.
   */
  it('возвращает фокус на кнопку, открывшую окно', () => {
    render(<button type="button">Добавить</button>);

    const opener = screen.getByRole('button', { name: 'Добавить' });
    opener.focus();

    const { unmount } = renderModal();
    expect(opener).not.toHaveFocus();

    unmount();
    expect(opener).toHaveFocus();
  });

  /**
   * Кнопку удаления уносит та самая строка, которую окно удаляло, —
   * возвращать фокус некуда, и он падает на `body`: человек
   * с клавиатуры оказывается в начале страницы. Запасной адрес —
   * область содержимого рядом с таблицей.
   */
  it('уводит фокус в содержимое страницы, если кнопки больше нет', () => {
    render(
      <main>
        <button type="button">Удалить дисциплину «Базы данных»</button>
      </main>,
    );

    const opener = screen.getByRole('button', { name: 'Удалить дисциплину «Базы данных»' });
    opener.focus();

    const { unmount } = renderModal();

    // Строка исчезла вместе с записью, пока окно было открыто.
    opener.remove();
    unmount();

    const content = document.querySelector('main');
    expect(content).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  /** `tabindex` у содержимого — временный: иначе полстраницы станет остановкой табуляции. */
  it('снимает у содержимого временный tabindex, когда фокус уходит дальше', () => {
    render(
      <main>
        <button type="button">Удалить</button>
      </main>,
    );

    const opener = screen.getByRole('button', { name: 'Удалить' });
    opener.focus();

    const { unmount } = renderModal();
    opener.remove();
    unmount();

    const content = document.querySelector('main')!;
    expect(content).toHaveAttribute('tabindex', '-1');

    fireEvent.blur(content);
    expect(content).not.toHaveAttribute('tabindex');
  });

  it('закрывается по Escape', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('закрывается кликом по подложке', () => {
    const { onClose } = renderModal();

    fireEvent.click(backdrop());

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /**
   * Пока идёт запрос, окно держится: закрытое на полпути, оно оставило бы
   * человека без ответа, сохранилось ли что-нибудь.
   */
  it('не закрывается, пока идёт запрос', () => {
    const { onClose } = renderModal({ isBusy: true });

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(backdrop());

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Закрыть' })).toBeDisabled();
  });

  /**
   * Ловушка фокуса: с последнего элемента Tab уводит на первый, а не
   * на страницу под окном — иначе с клавиатуры из окна можно уйти,
   * не закрыв его.
   */
  it('замыкает табуляцию внутри окна', () => {
    renderModal();

    screen.getByRole('button', { name: 'Сохранить' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();
  });
});
