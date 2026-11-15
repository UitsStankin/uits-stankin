import { ChevronLeft, ChevronRight } from 'lucide-react';

import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

import type { TeacherScheduleState } from '../model/useTeacherSchedule';
import { ScheduleDayCard } from './ScheduleDayCard';

interface TeacherScheduleProps {
  state: TeacherScheduleState;
}

const navButtonClass =
  'inline-flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-text-default transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50';

/**
 * Блок расписания на карточке преподавателя. Чистый: получает разобранное
 * состояние, решает за него `model/useTeacherSchedule`.
 *
 * **Пустого состояния у блока нет**, как у достижений: расписание
 * загружено не у каждого преподавателя, и «Расписание не загружено»
 * под половиной карточек посетителю ничего не говорит. Сбой — другое
 * дело: данные есть, но не доехали. Скелета нет по той же причине,
 * что у достижений: силуэт, мигнувший и исчезнувший под профилем
 * у преподавателя без расписания, — дёрганье страницы на пустом месте.
 *
 * Сетка — карточки дней, а не таблица «дни × номера пар». Таблица
 * на шесть колонок не помещается в телефон, а две разметки на одни
 * данные — одна для узкого экрана, другая для широкого — означали бы
 * каждую пару в DOM дважды. Карточки дней на телефоне идут столбцом,
 * на широком экране — сеткой по три.
 */
export function TeacherSchedule({ state }: TeacherScheduleProps) {
  const {
    hasSchedule,
    days,
    today,
    weekLabel,
    isCurrentWeek,
    nearestWeek,
    showPreviousWeek,
    showNextWeek,
    showCurrentWeek,
    showNearestWeek,
    isOffline,
    isError,
    errorMessage,
    refetch,
  } = state;

  if (!hasSchedule && !isOffline && !isError) return null;

  return (
    <section className="flex flex-col gap-4 rounded bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-h5 text-text-heading">Расписание занятий</h2>

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить расписание"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {hasSchedule && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Подпись недели объявляется при листании: без этого читалка
                экрана после нажатия «Следующая неделя» молчит, и понять,
                что сетка сменилась, можно только перечитав её. */}
            <p aria-live="polite" className="text-base font-bold text-text-heading">
              {weekLabel}
            </p>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={showPreviousWeek} className={navButtonClass}>
                <ChevronLeft size={16} aria-hidden />
                Предыдущая
              </button>
              <button
                type="button"
                onClick={showCurrentWeek}
                disabled={isCurrentWeek}
                className={navButtonClass}
              >
                Текущая неделя
              </button>
              <button type="button" onClick={showNextWeek} className={navButtonClass}>
                Следующая
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          </div>

          {nearestWeek && (
            <div className="flex flex-col gap-2 rounded bg-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-base text-text-default">
                На этой неделе пар нет.{' '}
                {nearestWeek.isAhead ? 'Ближайшие — ' : 'Последние были — '}
                {nearestWeek.label}
              </p>
              <button
                type="button"
                onClick={showNearestWeek}
                className="w-fit shrink-0 text-base font-bold text-primary hover:underline"
              >
                Показать эту неделю
              </button>
            </div>
          )}

          {!nearestWeek && (
            <div className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2 lg:grid-cols-3">
              {days.map((day) => (
                <ScheduleDayCard key={day.day} day={day} isToday={day.day === today} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
