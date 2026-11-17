import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@shared/lib';

import { CALENDAR_VIEWS, type CalendarViewKind } from '../lib/calendarNavigation';

interface CalendarToolbarProps {
  title: string;
  view: CalendarViewKind;
  isShowingToday: boolean;
  onViewChange: (view: CalendarViewKind) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** Подписи стрелок для читалки экрана: у кнопок-стрелок нет текста. */
const STEP_LABELS: Record<CalendarViewKind, { previous: string; next: string }> = {
  month: { previous: 'Предыдущий месяц', next: 'Следующий месяц' },
  list: { previous: 'Предыдущий месяц', next: 'Следующий месяц' },
  week: { previous: 'Предыдущая неделя', next: 'Следующая неделя' },
  day: { previous: 'Предыдущий день', next: 'Следующий день' },
};

const buttonClass =
  'inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-text-default transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50';

/**
 * Заголовок промежутка, листание и выбор вида — над календарём, как
 * у `angular-calendar` в оригинале: «‹ › Сегодня» слева, «Месяц · Неделя ·
 * День» справа. Чистый: состояние держит `model/useCalendarPage`.
 *
 * Своя панель, а не встроенная в FullCalendar: та рисуется своей вёрсткой
 * и своими кнопками, а у портала кнопки одни на все страницы — те же,
 * что у листания недель в расписании.
 */
export function CalendarToolbar({
  title,
  view,
  isShowingToday,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  const labels = STEP_LABELS[view];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/* Подпись объявляется при листании: иначе читалка экрана после
            «Следующий» молчит, и сменилась ли сетка, не понять. */}
        <h2 aria-live="polite" className="mr-2 text-h5 text-text-heading">
          {title}
        </h2>

        <button
          type="button"
          onClick={onPrevious}
          aria-label={labels.previous}
          className={buttonClass}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <button type="button" onClick={onNext} aria-label={labels.next} className={buttonClass}>
          <ChevronRight size={16} aria-hidden />
        </button>
        <button type="button" onClick={onToday} disabled={isShowingToday} className={buttonClass}>
          Сегодня
        </button>
      </div>

      <div role="group" aria-label="Вид календаря" className="flex flex-wrap gap-1">
        {CALENDAR_VIEWS.map(({ kind, title: viewTitle }) => (
          <button
            key={kind}
            type="button"
            aria-pressed={kind === view}
            onClick={() => onViewChange(kind)}
            className={cn(
              buttonClass,
              kind === view && 'border-primary bg-primary text-white hover:text-white',
            )}
          >
            {viewTitle}
          </button>
        ))}
      </div>
    </div>
  );
}
