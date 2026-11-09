import { useEffect, useRef, type RefObject } from 'react';

import { focusPageContent } from '@shared/lib';

/**
 * Не дать фокусу упасть в начало страницы, когда строка с ним исчезла.
 *
 * Так заканчивается каждое удаление, и поймано это на живом стенде
 * (2026-09-10): нажал «Удалить» в строке, подтвердил — и фокус на `body`,
 * то есть следующий Tab идёт от шапки портала.
 *
 * Последовательность, из-за которой не помогает возврат фокуса
 * у модального окна (`Modal/model/useModalBehavior.ts`): к моменту, когда
 * окно закрывается, строка ещё **на месте** — список перерисуется позже,
 * когда доедет перезапрос. Окно честно возвращает фокус на кнопку
 * удаления, и она исчезает уже после этого, у него за спиной. Проверено
 * в браузере подменой `HTMLElement.prototype.focus`: в журнале видно
 * `focus()` на кнопку, которая ещё в документе, и через мгновение —
 * `body`.
 *
 * Значит, чинить это должен тот, кто знает, что строки сменились, —
 * таблица. Здесь и чиним, а не на странице дисциплин: удаление будет
 * у каждого раздела админки (F-43…F-47), и переданный страницей запасной
 * элемент забыли бы ровно один раз.
 *
 * Куда уводим: в саму прокручиваемую область таблицы. Она уже
 * в порядке табуляции и уже названа для диктора (`role="region"`
 * с подписью), то есть человек остаётся там, где работал, и слышит
 * «Дисциплины». Кнопка «Добавить» рядом, в одном Tab; соседняя строка
 * не годится — её кнопка удаления встала бы под палец сразу после
 * удаления предыдущей.
 *
 * Признак «фокус был внутри» ведётся руками: браузер, убирая элемент
 * с фокусом, события `blur` не шлёт вовсе — в том же журнале нет ни одного
 * `focusout`, — поэтому узнать об этом постфактум можно только так.
 */
export function useRowFocusRescue(regionRef: RefObject<HTMLElement | null>, rows: unknown) {
  const hadFocusInside = useRef(false);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;

    const onFocusIn = () => {
      hadFocusInside.current = true;
    };

    // Уход фокуса наружу — это уже не наша забота: человек сам ушёл
    // из таблицы, и возвращать его туда при следующей перерисовке
    // означало бы дёргать фокус под руками.
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget;

      if (next instanceof Node && region.contains(next)) return;

      hadFocusInside.current = false;
    };

    region.addEventListener('focusin', onFocusIn);
    region.addEventListener('focusout', onFocusOut);

    return () => {
      region.removeEventListener('focusin', onFocusIn);
      region.removeEventListener('focusout', onFocusOut);
    };
  }, [regionRef]);

  useEffect(() => {
    const region = regionRef.current;

    if (!region || !hadFocusInside.current) return;
    // Фокус на месте — строки сменились, но не та, в которой он стоял.
    if (region.contains(document.activeElement)) return;

    region.focus();
  }, [regionRef, rows]);

  /*
   * Удалили последнюю строку — таблицы на экране больше нет вовсе:
   * раздел показывает вместо неё «записей пока нет», и подхватить фокус
   * некому даже здесь. Тогда уводим его туда же, куда уводит закрывшееся
   * окно с исчезнувшей кнопкой, — в область содержимого страницы.
   *
   * Отдельным эффектом без зависимостей: этот разбор нужен ровно
   * при размонтировании, а не на каждой смене строк.
   */
  useEffect(
    () => () => {
      if (hadFocusInside.current) focusPageContent();
    },
    [],
  );
}
