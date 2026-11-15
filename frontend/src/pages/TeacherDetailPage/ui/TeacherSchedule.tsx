import { NearestWeekNotice, WeekNavigation } from '@entities/schedule';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

import type { TeacherScheduleState } from '../model/useTeacherSchedule';
import { ScheduleDayCard } from './ScheduleDayCard';

interface TeacherScheduleProps {
  state: TeacherScheduleState;
}

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
  const { week, isOffline, isError, errorMessage, refetch } = state;
  const { hasLessons: hasSchedule, days, today, nearestWeek } = week;

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
          <WeekNavigation
            weekLabel={week.weekLabel}
            isCurrentWeek={week.isCurrentWeek}
            onPrevious={week.showPreviousWeek}
            onNext={week.showNextWeek}
            onCurrent={week.showCurrentWeek}
          />

          {nearestWeek && <NearestWeekNotice hint={nearestWeek} onShow={week.showNearestWeek} />}

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
