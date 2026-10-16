import { create } from 'zustand';

/**
 * Тон сообщения. Их ровно два: получилось и не получилось.
 *
 * Третий («предупреждение») не заведён намеренно — тост показывается
 * в ответ на действие, а у действия исход бинарный. Промежуточные
 * состояния («сохраняем…») живут на кнопке формы, а не в углу экрана.
 */
export type ToastTone = 'success' | 'error';

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastStore {
  toasts: ToastMessage[];
  push: (tone: ToastTone, text: string) => void;
  dismiss: (id: number) => void;
}

/**
 * Очередь всплывающих сообщений.
 *
 * Живёт в сторе, а не в состоянии компонента, по той же причине, что и
 * панель мобильного меню: показывает сообщение один виджет
 * (`shared/ui/Toast`), а поднимают его мутации из форм и таблиц админки —
 * места, между которыми нет общего родителя ближе, чем всё приложение.
 *
 * Отдельным файлом от `appStore`, а не полем в нём: у тостов свой цикл
 * жизни (сообщение снимается по таймеру), и подписка виджета меню
 * на список сообщений перерисовывала бы меню на каждый тост.
 *
 * `id` — счётчик, а не время и не случайное число: два сообщения,
 * поднятые в одном обработчике, получили бы одинаковый `Date.now()`,
 * и React увидел бы два элемента с одним ключом.
 */
let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: (tone, text) =>
    set((state) => ({ toasts: [...state.toasts, { id: nextId++, tone, text }] })),

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

/**
 * Как тост поднимают из кода: `toast.success('Дисциплина сохранена')`.
 *
 * Не хук — и это главное в нём. Сообщение поднимается из колбэка мутации
 * (`onSuccess`, `onError`), то есть не во время рендера и иногда уже после
 * размонтирования формы; хук там позвать нельзя. Обёртка над
 * `getState()` делает вызов возможным откуда угодно, а подписка остаётся
 * ровно одна — у виджета, который тосты рисует.
 */
export const toast = {
  success: (text: string) => useToastStore.getState().push('success', text),
  error: (text: string) => useToastStore.getState().push('error', text),
};
