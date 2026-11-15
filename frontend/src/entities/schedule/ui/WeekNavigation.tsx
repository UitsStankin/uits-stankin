import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { NearestWeekHint } from '../model/useScheduleWeek';

interface WeekNavigationProps {
  weekLabel: string;
  isCurrentWeek: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCurrent: () => void;
}

const navButtonClass =
  'inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-text-default transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50';

/**
 * Подпись недели и листание: предыдущая, текущая, следующая. Чистый —
 * состояние держит `model/useScheduleWeek`.
 */
export function WeekNavigation({
  weekLabel,
  isCurrentWeek,
  onPrevious,
  onNext,
  onCurrent,
}: WeekNavigationProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Подпись недели объявляется при листании: без этого читалка
          экрана после нажатия «Следующая неделя» молчит, и понять,
          что сетка сменилась, можно только перечитав её. */}
      <p aria-live="polite" className="text-base font-bold text-text-heading">
        {weekLabel}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onPrevious} className={navButtonClass}>
          <ChevronLeft size={16} aria-hidden />
          Предыдущая
        </button>
        <button
          type="button"
          onClick={onCurrent}
          disabled={isCurrentWeek}
          className={navButtonClass}
        >
          Текущая неделя
        </button>
        <button type="button" onClick={onNext} className={navButtonClass}>
          Следующая
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}

interface NearestWeekNoticeProps {
  hint: NearestWeekHint;
  onShow: () => void;
}

/** «На этой неделе пар нет. Ближайшие — …» и переход к той неделе. */
export function NearestWeekNotice({ hint, onShow }: NearestWeekNoticeProps) {
  return (
    <div className="flex flex-col gap-2 rounded bg-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base text-text-default">
        На этой неделе пар нет. {hint.isAhead ? 'Ближайшие — ' : 'Последние были — '}
        {hint.label}
      </p>
      <button
        type="button"
        onClick={onShow}
        className="w-fit shrink-0 text-base font-bold text-primary hover:underline"
      >
        Показать эту неделю
      </button>
    </div>
  );
}
