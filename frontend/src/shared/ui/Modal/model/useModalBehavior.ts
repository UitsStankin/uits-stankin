import { useEffect, type RefObject } from 'react';

import { focusPageContent } from '@shared/lib';

/** Что умеет получать фокус внутри панели. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * То же самое, но только внутри содержимого окна.
 *
 * Префикс приписывается каждой части списка, а не один раз ко всему:
 * `'[data-modal-body] a, button'` — это «ссылка внутри содержимого ИЛИ
 * любая кнопка страницы», то есть ровно то, чего мы избегаем.
 */
const FOCUSABLE_IN_BODY = FOCUSABLE.split(', ')
  .map((selector) => `[data-modal-body] ${selector}`)
  .join(', ');

/**
 * Поведение модального окна: фокус внутри, Escape закрывает, фокус
 * возвращается туда, откуда пришли.
 *
 * Всё три пункта — не украшения, а условие того, чтобы окном можно было
 * пользоваться с клавиатуры:
 *
 * - без переноса фокуса внутрь табуляция продолжилась бы по странице
 *   ЗА окном, и первое поле формы пришлось бы искать вслепую;
 * - без ловушки фокус уходит из окна на третьем нажатии Tab и дальше
 *   бродит по закрытой окном странице;
 * - без возврата фокус после закрытия оказывается в начале документа,
 *   и человек, открывший форму кнопкой в двадцатой строке таблицы,
 *   возвращается в начало страницы. То же самое, если возвращать некуда:
 *   кнопку удаления уносит удалённая строка — разбор ниже, в самом
 *   возврате.
 *
 * Escape не закрывает, пока идёт запрос: закрытая на полпути форма
 * оставила бы пользователя без ответа, сохранилось ли что-нибудь.
 */
export function useModalBehavior(
  panelRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
  isBusy: boolean,
) {
  // Фокус: внутрь при открытии, обратно при закрытии.
  useEffect(() => {
    const returnTo = document.activeElement;
    const panel = panelRef.current;

    // Первое поле СОДЕРЖИМОГО, а не первый фокусируемый элемент вообще:
    // первым в разметке идёт крестик «Закрыть», и фокус на нём означал бы,
    // что форму открыли, поставив палец на кнопку выхода. Полей нет —
    // фокус на самой панели: диктор прочитает заголовок, а до кнопок
    // можно дойти табуляцией.
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE_IN_BODY);
    (first ?? panel)?.focus();

    return () => {
      if (returnTo instanceof HTMLElement && document.contains(returnTo)) {
        returnTo.focus();
        return;
      }

      /*
       * Возвращать некуда: элемента, открывшего окно, в документе уже
       * нет — список успел перерисоваться, пока окно было открыто.
       * `focus()` на оторванном от документа элементе молча ничего
       * не делает, и фокус остаётся на `body`, то есть в начале страницы.
       *
       * Обычное удаление сюда **не** попадает, и это проверено
       * в браузере: к моменту закрытия окна строка ещё на месте,
       * а исчезает позже, когда доедет перезапрос списка. Тот случай
       * ловит сама таблица — `DataTable/model/useRowFocusRescue.ts`.
       *
       * Запасной адрес — область содержимого страницы; тот же, что
       * у таблицы, потерявшей последнюю строку, и по той же причине.
       */
      focusPageContent();
    };
  }, [panelRef]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!isBusy) onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Кольцо: с последнего элемента вперёд — на первый, с первого
      // назад — на последний. Браузер сам этого не делает, для него
      // за панелью продолжается обычная страница.
      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelRef, onClose, isBusy]);
}
