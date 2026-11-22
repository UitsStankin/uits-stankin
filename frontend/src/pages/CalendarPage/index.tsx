import { Plus } from 'lucide-react';

import { EventDialog } from '@features/manage-events';
import { pluralize } from '@shared/lib';
import type { UserEvent } from '@shared/types';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';
import Loader from '@shared/ui/Loader';

import { useCalendarPage } from './model/useCalendarPage';
import { CalendarToolbar } from './ui/CalendarToolbar';
import { EventCalendar } from './ui/EventCalendar';
import { EventDetails } from './ui/EventDetails';

/**
 * Календарь событий `/corp/calendar` (F-59, F-60). Сборка: состояние
 * из модели, разметка из чистых компонентов, сам календарь — ленивым куском.
 *
 * Правка (F-60): «Создать событие» в заголовке, «Изменить» и «Удалить»
 * в карточке события. Кнопки «Уведомление» с Telegram, как в оригинале,
 * не будет вовсе — напоминания сняты (ARCHITECTURE.md §8, п. 14).
 *
 * Ширина `max-w-7xl`: месячной сетке нужна вся строка.
 */
export default function CalendarPage() {
  const state = useCalendarPage();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-gutter">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-h4 text-text-heading">Календарь событий</h1>
          <p className="text-base text-text-default">
            Ваши события и те, на которые вас назначили.
          </p>
        </div>

        {/* Создать можно и без выдачи: форме она не нужна. */}
        <button
          type="button"
          onClick={state.startCreate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Создать событие
        </button>
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

      {/* Пустой календарь — сетка всё равно нужна: созданное событие
          появится в ней. Подсказка — над ней, а не вместо неё. */}
      {state.isEmpty && (
        <StatusBlock
          title="Событий пока нет"
          description="Создайте первое кнопкой «Создать событие» или дождитесь, пока вас назначат на чужое."
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

      {state.selected && !state.editing && !state.deleting && (
        <EventDetails
          event={state.selected}
          onClose={state.closeSelected}
          onEdit={state.startEdit}
          onDelete={state.askDelete}
        />
      )}

      {/* Форма монтируется только на время правки: начальные значения
          берутся при монтировании. */}
      {state.editing && (
        <EventDialog
          event={state.editing.event}
          day={state.newEventDay}
          onClose={state.closeEditor}
        />
      )}

      {state.deleting && (
        <ConfirmDialog
          title="Удалить событие?"
          description={deleteDescription(state.deleting)}
          confirmLabel="Удалить"
          onConfirm={state.confirmDelete}
          onCancel={state.cancelDelete}
          isPending={state.isDeleting}
        />
      )}
    </div>
  );
}

/**
 * Что пропадёт. Назначенных окно называет числом: событие исчезнет
 * и из их календарей, а удалить его может любой из них, не только
 * тот, кто создал.
 */
function deleteDescription(event: UserEvent): string {
  const count = event.assignedUsers.length;
  const whom =
    count === 0
      ? ''
      : ` Оно пропадёт и у ${String(count)} ${pluralize(count, ['назначенного', 'назначенных', 'назначенных'])}.`;

  return `Событие «${event.name}» будет удалено, и восстановить его нечем.${whom}`;
}
