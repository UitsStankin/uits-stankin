import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { cn } from '@shared/lib';

import { useModalBehavior } from './model/useModalBehavior';

interface ModalProps {
  title: string;
  onClose: () => void;
  /**
   * `side` — панель, выезжающая справа: в ней живут формы, которые правят
   * запись из таблицы, и таблица остаётся видна рядом.
   * `center` — окно посреди экрана: им спрашивают подтверждение, и рядом
   * смотреть не на что.
   */
  placement?: 'side' | 'center';
  /**
   * Идёт запрос: окно нельзя закрыть ни подложкой, ни Escape. Закрытое
   * на полпути, оно оставило бы человека без ответа, сохранилось ли
   * что-нибудь.
   */
  isBusy?: boolean;
  children: ReactNode;
}

/**
 * Модальное окно админки — общая оболочка для формы правки
 * и для подтверждения удаления.
 *
 * В ARCHITECTURE §5.5 это названо `FormDrawer`, но оболочка знает
 * только про подложку, заголовок, фокус и Escape; саму форму — поля,
 * кнопки «Сохранить» и «Отмена», отправку — приносит фича. Иначе
 * оболочка на слое `shared` знала бы про формы конкретных сущностей,
 * а это уже не общий компонент.
 *
 * Рисуется порталом в `body`: панель с `position: fixed` внутри элемента
 * с `transform` или `filter` позиционируется относительно него,
 * а не окна, — и всплывающая форма однажды оказалась бы внутри карточки
 * таблицы, без всякой ошибки в коде.
 */
export default function Modal({
  title,
  onClose,
  placement = 'side',
  isBusy = false,
  children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useModalBehavior(panelRef, onClose, isBusy);

  return createPortal(
    <div className="fixed inset-0 z-modal flex">
      {/*
        Подложка — `div`, а не `button` во всю страницу: кнопка размером
        с экран попадает в обход табом и читается диктором как «кнопка»
        без имени. Закрытие по клику здесь дублирующее, для мыши;
        с клавиатуры окно закрывают Escape и кнопкой «Закрыть».
      */}
      <div
        aria-hidden="true"
        onClick={isBusy ? undefined : onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative z-modal flex max-h-full flex-col overflow-y-auto bg-white shadow-lg',
          placement === 'side'
            ? 'ml-auto h-full w-full max-w-xl animate-slide-in-right'
            : 'm-auto w-full max-w-md rounded animate-fade-in',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-default px-gutter py-4">
          <h2 id={titleId} className="text-h5 text-text-heading">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Закрыть"
            className="-mr-2 -mt-1 rounded p-1 text-text-muted transition-colors hover:text-text-heading disabled:opacity-50"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {/* `data-modal-body` — метка для переноса фокуса: он ставится
            на первое поле содержимого, а не на крестик в шапке. */}
        <div data-modal-body className="flex flex-1 flex-col px-gutter py-gutter-sm">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
