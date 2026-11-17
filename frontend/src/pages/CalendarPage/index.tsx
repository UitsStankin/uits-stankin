import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';
import Loader from '@shared/ui/Loader';

import { useCalendarPage } from './model/useCalendarPage';
import { CalendarToolbar } from './ui/CalendarToolbar';
import { EventCalendar } from './ui/EventCalendar';
import { EventDetails } from './ui/EventDetails';

/**
 * Календарь событий `/corp/calendar` (F-59). Сборка: состояние из модели,
 * разметка из чистых компонентов, сам календарь — ленивым куском.
 *
 * Пока только чтение: кнопка «Создать событие» и правка по клику
 * приедут с F-60. Кнопки «Уведомление» с Telegram, как в оригинале,
 * не будет вовсе — напоминания сняты (ARCHITECTURE.md §8, п. 14).
 *
 * Ширина `max-w-7xl`: месячной сетке нужна вся строка.
 */
export default function CalendarPage() {
  const state = useCalendarPage();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-gutter">
      <div className="flex flex-col gap-1">
        <h1 className="text-h4 text-text-heading">Календарь событий</h1>
        <p className="text-base text-text-default">
          Ваши события и те, на которые вас назначили.
        </p>
      </div>

      {state.isLoading && <Loader />}

      {state.isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={state.refetch} />}
        />
      )}

      {state.isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить события"
          description={state.errorMessage}
          action={<RetryButton onClick={state.refetch} />}
        />
      )}

      {/* Пустой календарь — сетка всё равно нужна: в ней будут создавать
          события (F-60). Подсказка — над ней, а не вместо неё. */}
      {state.isEmpty && (
        <StatusBlock
          title="Событий пока нет"
          description="Здесь появятся события, которые вы создадите или на которые вас назначат."
        />
      )}

      {!state.isLoading && !state.isOffline && !state.isError && (
        <>
          <CalendarToolbar
            title={state.title}
            view={state.view}
            isShowingToday={state.isShowingToday}
            onViewChange={state.setView}
            onPrevious={state.showPrevious}
            onNext={state.showNext}
            onToday={state.showToday}
          />

          <EventCalendar
            view={state.view}
            anchor={state.anchor}
            items={state.items}
            onItemClick={state.select}
          />
        </>
      )}

      {state.selected && <EventDetails event={state.selected} onClose={state.closeSelected} />}
    </div>
  );
}
