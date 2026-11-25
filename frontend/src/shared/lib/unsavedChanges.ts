import { useEffect, useId, useRef } from 'react';
import { create } from 'zustand';

/**
 * Какие формы сейчас держат несохранённое: множество их `useId`.
 *
 * Общее, а не у каждой формы своё, потому что спрашивает о нём одно место —
 * `UnsavedChangesGuard` в лейауте. Роутер держит **один** блокировщик
 * переходов на всё приложение: второй `useBlocker` перебивает первый
 * с предупреждением в консоли. А форм одновременно бывает несколько —
 * в личном кабинете открыты рядом правка профиля и карточки ППС.
 */
const useDirtyForms = create<{ ids: ReadonlySet<string> }>()(() => ({ ids: new Set() }));

function setDirty(id: string, isDirty: boolean) {
  const { ids } = useDirtyForms.getState();

  if (ids.has(id) === isDirty) return;

  const next = new Set(ids);
  if (isDirty) next.add(id);
  else next.delete(id);

  useDirtyForms.setState({ ids: next });
}

/**
 * Есть ли где-нибудь несохранённое — **в момент вызова**.
 *
 * Функция, а не подписка: блокировщик решает в момент перехода, и ему
 * нужен ответ на сейчас, а не на прошлый рендер. Форма, успешно
 * сохранившись, снимает отметку и сразу же уводит на список —
 * в одном обработчике, до всякого рендера.
 */
export function hasUnsavedChanges(): boolean {
  return useDirtyForms.getState().ids.size > 0;
}

/** После подтверждённого выхода все открытые формы будут закрыты. */
export function discardUnsavedChanges(): void {
  useDirtyForms.setState({ ids: new Set() });
}

/** Подписка для того, кому нужен перерендер: слушателю `beforeunload`. */
export function useHasUnsavedChanges(): boolean {
  return useDirtyForms((state) => state.ids.size > 0);
}

/**
 * Отметить форму как держащую несохранённое, пока `isDirty` истинно.
 *
 * Отметка снимается сама с размонтированием формы и вручную — `release()`.
 * Вручную — после успешного сохранения, **до** перехода: форма к этому
 * моменту ещё «грязная» (значения разошлись с начальными, их просто
 * записали), и без снятия сторож спросил бы «уйти без сохранения?» сразу
 * после «Сохранено».
 *
 * `released` держит снятие до размонтирования: перерендер между
 * сохранением и уходом со страницы иначе поставил бы отметку обратно.
 */
export function useUnsavedChanges(isDirty: boolean): { release: () => void } {
  const id = useId();
  const released = useRef(false);

  useEffect(() => {
    setDirty(id, isDirty && !released.current);
  }, [id, isDirty]);

  useEffect(() => () => setDirty(id, false), [id]);

  return {
    release: () => {
      released.current = true;
      setDirty(id, false);
    },
  };
}
