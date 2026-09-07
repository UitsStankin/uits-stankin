import { useToastStore } from '@shared/store';

import { useToastTimers } from './model/useToastTimers';
import { ToastCard } from './ui/ToastCard';

/**
 * Уголок всплывающих сообщений: «сохранено», «удалено», «не удалось».
 *
 * Смонтирован один раз на всё приложение (`app/App.tsx`), а не в лейауте
 * админки, хотя сегодня тосты поднимает только она. Тост, поднятый там,
 * где виджета нет, исчез бы молча — то есть форма отчиталась бы об успехе
 * в пустоту; такую поломку не видно ни в типах, ни в тестах самой формы.
 *
 * Область объявлена живой (`aria-live`) заранее и всегда: диктор читает
 * появившееся в ней содержимое только если сама область была в DOM
 * до появления текста. Вежливо, а не `assertive`: тост — ответ на действие
 * пользователя, он не срочнее того, что человек делает прямо сейчас,
 * и перебивать диктора на полуслове ему незачем.
 */
export default function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  useToastTimers(toasts, dismiss);

  return (
    <div
      aria-live="polite"
      // Контейнер висит поверх страницы всегда, поэтому он прозрачен
      // для мыши — клики уходят на то, что под ним. Обратно события
      // включает сама плашка (`pointer-events-auto`), иначе крестик
      // перестал бы нажиматься.
      className="pointer-events-none fixed inset-x-gutter-sm bottom-gutter-sm z-toast flex flex-col gap-2 sm:inset-x-auto sm:right-gutter sm:bottom-gutter sm:w-96"
    >
      {toasts.map((message) => (
        <ToastCard
          key={message.id}
          tone={message.tone}
          text={message.text}
          onClose={() => dismiss(message.id)}
        />
      ))}
    </div>
  );
}
