import { useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Строка под панелью закрылась — курсор возвращается в текст, откуда бы
 * её ни закрыли: «Применить», «Вставить», «Отмена», Escape.
 *
 * Одним правилом в одном месте, а не вызовом `focus()` в каждом
 * обработчике каждой строки: забытый в одном из них означал бы, что
 * человек остался с фокусом на кнопке, которой больше нет на экране, —
 * то есть на `body`, в начале страницы.
 *
 * Общий для строки ссылки и строки картинки: у обеих один и тот же
 * способ появиться и исчезнуть, и разошедшийся возврат фокуса был бы
 * дефектом, который ловится только клавиатурой.
 *
 * Возврат приходит через кадр: `focus()` у TipTap отложен
 * `requestAnimationFrame`. Поэтому и тесты ждут его через `waitFor`.
 */
export function useFocusOnClose(isOpen: boolean, editor: Editor | null) {
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !isOpen && editor && !editor.isDestroyed) editor.commands.focus();

    wasOpen.current = isOpen;
  }, [isOpen, editor]);
}
