import { type ScheduleDay, classTimeRange, formatDayMonth } from '@entities/schedule';
import { cn } from '@shared/lib';
import type { ScheduleLesson, WeekDay } from '@shared/types';

const WEEK_DAY_NAMES: Record<WeekDay, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

interface ScheduleDayCardProps {
  day: ScheduleDay;
  isToday: boolean;
}

/**
 * Один день недели с его парами. Чистый: день на входе, разметка на выходе.
 *
 * День без пар остаётся в сетке с надписью, а не пропадает: сетка
 * из шести колонок, у которой выпала среда, читается как сдвинутая —
 * пары четверга оказываются под заголовком колонки, где ждут среду.
 */
export function ScheduleDayCard({ day, isToday }: ScheduleDayCardProps) {
  const title = `${WEEK_DAY_NAMES[day.weekDay]}, ${formatDayMonth(day.day)}`;

  return (
    <section
      aria-label={title}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        'flex flex-col gap-3 rounded border p-4',
        isToday ? 'border-primary' : 'border-gray-300',
      )}
    >
      <h3 className="text-base font-bold text-text-heading">
        {title}
        {isToday && <span className="ml-2 text-sm font-normal text-primary">сегодня</span>}
      </h3>

      {day.lessons.length === 0 ? (
        <p className="text-sm text-text-muted">Пар нет</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {day.lessons.map((lesson) => (
            <li key={lesson.id}>
              <LessonItem lesson={lesson} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Пара: время и вид занятия, название, группа с подгруппой и аудитория.
 * Незаполненная аудитория не показывается вовсе — как пустые поля
 * карточки ППС, — а не подписывается «ауд. —».
 */
function LessonItem({ lesson }: { lesson: ScheduleLesson }) {
  const group = lesson.subgroup ? `${lesson.group}, подгруппа ${lesson.subgroup}` : lesson.group;

  return (
    <article className="flex flex-col gap-0.5">
      <p className="text-sm text-text-muted">
        <span className="font-bold text-text-default">{classTimeRange(lesson.classTime)}</span>
        {' · '}
        {lesson.type}
      </p>
      <p className="text-base leading-snug text-text-heading">{lesson.name}</p>
      <p className="text-sm text-text-default">
        {group}
        {lesson.cabinet && <> · ауд. {lesson.cabinet}</>}
      </p>
    </article>
  );
}
