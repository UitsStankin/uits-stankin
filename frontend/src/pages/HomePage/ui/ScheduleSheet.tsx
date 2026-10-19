import type { CSSProperties } from 'react';

import { pluralize } from '@shared/lib';
import type { ClassTime } from '@shared/types';
import { WEEK_DAYS, classStartTime, trimSeconds, type FoundLesson } from '@entities/schedule';

import { groupByDiscipline } from '../lib/groupLessons';
import { ScheduleLine } from './ScheduleLine';

interface ScheduleSheetProps {
  lessons: readonly FoundLesson[];
}

function classTimesBetween(lessons: readonly FoundLesson[]): ClassTime[] {
  const first = Math.min(...lessons.map((lesson) => lesson.classTime));
  const last = Math.max(...lessons.map((lesson) => lesson.classTime));

  return Array.from({ length: last - first + 1 }, (_, index) => (first + index) as ClassTime);
}

export function ScheduleSheet({ lessons }: ScheduleSheetProps) {
  const days = WEEK_DAYS.filter((day) => lessons.some((lesson) => lesson.weekNumber === day.number));
  const times = classTimesBetween(lessons);
  const today = new Date().getDay();
  const style = { '--u-sheet-days': days.length } as CSSProperties;

  return (
    <div className="u-sheet-block">
      <p className="u-inbox-summary" aria-live="polite">
        {`Найдено ${lessons.length} ${pluralize(lessons.length, ['пара', 'пары', 'пар'])}, неделя целиком`}
      </p>

      <div className="u-sheet-wrap" role="region" aria-label="Расписание на неделю" tabIndex={0}>
        <table className="u-sheet" style={style}>
          <thead>
            <tr>
              <th scope="col" className="u-sheet-corner">
                Пара
              </th>
              {days.map((day) => (
                <th
                  key={day.number}
                  scope="col"
                  data-today={day.number === today ? '' : undefined}
                >
                  {day.name}
                  <small>
                    {lessons.filter((lesson) => lesson.weekNumber === day.number).length}
                  </small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <th scope="row" className="u-sheet-time">
                  {trimSeconds(classStartTime(time))}
                  <small>{time}-я пара</small>
                </th>
                {days.map((day) => (
                  <td key={day.number}>
                    {groupByDiscipline(
                      lessons.filter(
                        (lesson) => lesson.weekNumber === day.number && lesson.classTime === time,
                      ),
                    ).map((group) => (
                      <SheetItem key={group[0].id} lessons={group} />
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SheetItem({ lessons }: { lessons: readonly FoundLesson[] }) {
  const head = lessons[0];
  const headDetails = [head.group, !head.byTeacher && head.teacher].filter(Boolean).join(' · ');

  return (
    <div className="u-sheet-item">
      <div className="u-sheet-name">{head.name}</div>
      <div className="u-sheet-meta">
        {head.type && <span className="u-sheet-type">{head.type}</span>}
        {head.type && headDetails && ' · '}
        {headDetails}
      </div>
      {lessons.map((lesson) => (
        <ScheduleLine key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}
