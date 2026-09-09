import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

import { checkHref } from '../lib/html';

/**
 * Строка ввода адреса ссылки: открыта ли, что набрано, что не так.
 *
 * Отдельно от `useRichTextEditor`, потому что меняется по своим поводам:
 * там — что умеет редактор, здесь — как спрашивают адрес.
 *
 * Почему не `window.prompt`, которым обходятся примеры TipTap: он
 * блокирует вкладку, его нельзя показать с уже набранным адресом
 * существующей ссылки, и текст отказа в нём показать негде — а отказ
 * здесь бывает, схемы `tel:` и `javascript:` до базы не доезжают.
 *
 * Почему не `<form>`: поле редактора живёт внутри формы записи, а вложенная
 * форма — невалидная разметка. Enter внутри строки поэтому обрабатывается
 * руками, иначе он отправил бы форму целиком (`ui/LinkBar.tsx`).
 */
export function useLinkForm(editor: Editor | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [href, setHref] = useState('');
  const [error, setError] = useState<string | null>(null);

  /*
   * Строка закрылась — курсор возвращается в текст, откуда бы её ни
   * закрыли: «Применить», «Убрать», «Отмена», Escape.
   *
   * Одним правилом в одном месте, а не вызовом `focus()` в каждом из
   * четырёх обработчиков: забытый в одном из них означал бы, что человек
   * остался с фокусом на кнопке, которой больше нет на экране, — то есть
   * на `body`, в начале страницы.
   *
   * Возврат приходит через кадр: `focus()` у TipTap отложен
   * `requestAnimationFrame`. Поэтому и тест ждёт его через `waitFor`.
   */
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !isOpen && editor && !editor.isDestroyed) editor.commands.focus();

    wasOpen.current = isOpen;
  }, [isOpen, editor]);

  /** Открыть строку: адрес существующей ссылки подставляется в поле. */
  function open() {
    setHref(editor?.getAttributes('link').href ?? '');
    setError(null);
    setIsOpen(true);
  }

  /** Закрыть строку; фокус вернёт эффект выше. */
  function close() {
    setIsOpen(false);
  }

  function apply() {
    if (!editor) return;

    const checked = checkHref(href);

    if ('error' in checked) {
      setError(checked.error);
      return;
    }

    setLink(editor, checked.href);
    setIsOpen(false);
  }

  function remove() {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    setIsOpen(false);
  }

  return {
    isOpen,
    href,
    error,
    /** Курсор стоит в ссылке — значит есть что убирать. */
    canRemove: editor?.isActive('link') ?? false,
    open,
    close,
    apply,
    remove,
    setHref,
  };
}

/**
 * Три случая, и они не сводятся к одной команде.
 *
 * Выделен текст — ссылкой становится он. Курсор стоит внутри ссылки без
 * выделения — правится вся ссылка целиком (`extendMarkRange`), иначе адрес
 * поменялся бы у куска слова. Ни того, ни другого — вешать ссылку не на что,
 * и адрес вставляется текстом: пустая ссылка в разметке ничего не даёт
 * ни зрячему, ни диктору.
 */
function setLink(editor: Editor, href: string) {
  const chain = editor.chain().focus();

  if (!editor.state.selection.empty) {
    chain.setLink({ href }).run();
    return;
  }

  if (editor.isActive('link')) {
    chain.extendMarkRange('link').setLink({ href }).run();
    return;
  }

  chain
    .insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
    // Метка ссылки иначе продолжится на следующем набранном символе:
    // курсор остаётся внутри неё, и текст после адреса тоже стал бы ссылкой.
    .unsetMark('link')
    .run();
}
