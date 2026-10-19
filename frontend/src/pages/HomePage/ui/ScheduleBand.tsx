import { useState, type KeyboardEvent } from 'react';

import { pluralize } from '@shared/lib';
import { useMediaQuery } from '@shared/lib/useMediaQuery';
import { Button } from '@shared/ui/brand/Button';
import {
  WEEK_DAYS,
  classStartTime,
  findLessons,
  shortName,
  trimSeconds,
  type DayNumber,
  type FoundLesson,
} from '@entities/schedule';
import type { TeacherSchedule } from '@shared/types';

import type { HomeListState } from '../model/useHomeContent';
import { groupByDiscipline } from '../lib/groupLessons';
import { ScheduleLine } from './ScheduleLine';
import { ScheduleSheet } from './ScheduleSheet';

const WIDE_QUERY = '(min-width: 1100px)';

interface ScheduleBandProps {
  schedules: HomeListState<TeacherSchedule>;
  query: string;
  onQueryChange: (query: string) => void;
}

function surname(teacherName: string): string {
  return teacherName.split(' ')[0];
}

function helpText(schedules: HomeListState<TeacherSchedule>): string {
  if (schedules.isLoading) return 'Загружаю расписания…';
  if (schedules.isError) return 'Не удалось загрузить расписания.';
  if (schedules.items.length === 0) return 'Расписания ещё не загружены.';

  const lessons = schedules.items.reduce((sum, item) => sum + item.lessons.length, 0);
  return `Загружено расписаний: ${schedules.items.length}, пар: ${lessons}. Источник: PDF-расписания кафедры.`;
}

export function ScheduleBand({ schedules, query, onQueryChange }: ScheduleBandProps) {
  const [draft, setDraft] = useState(query);
  const [shownQuery, setShownQuery] = useState(query);
  const lessons = findLessons(schedules.items, query);
  const normalized = query.trim().toLowerCase();
  const typed = draft.trim().toLowerCase();
  const picks = typed
    ? schedules.items.filter((schedule) => schedule.teacherName.toLowerCase().includes(typed))
    : schedules.items;

  if (query !== shownQuery) {
    setShownQuery(query);
    setDraft(query);
  }

  const apply = (next: string) => {
    setDraft(next);
    onQueryChange(next);
  };

  return (
    <section id="schedule" className="u-band" aria-labelledby="h-schedule">
      <div className="u-wrap">
        <div className="u-band-head">
          <h2 id="h-schedule" className="u-section-title">
            Расписание
          </h2>
          <p className="u-band-note" aria-live="polite">
            {helpText(schedules)}
          </p>
        </div>

        <div className="u-sched">
          <form
            className="u-sched-form"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              onQueryChange(draft);
            }}
          >
            <label htmlFor="sched-q" className="u-label">
              Преподаватель или группа
            </label>
            <div className="u-search">
              <input
                id="sched-q"
                type="search"
                autoComplete="off"
                placeholder="фамилия или группа"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (event.target.value.trim() === '') onQueryChange('');
                }}
              />
              <Button type="submit">Найти</Button>
            </div>

            <div className="u-chips u-picks">
              {picks.map((schedule) => {
                const name = surname(schedule.teacherName);
                const isOn = normalized !== '' && name.toLowerCase() === normalized;
                return (
                  <button
                    key={schedule.teacherId}
                    type="button"
                    className={isOn ? 'u-chip u-is-on' : 'u-chip'}
                    aria-pressed={isOn}
                    onClick={() => apply(name)}
                  >
                    {shortName(schedule.teacherName)}
                  </button>
                );
              })}
            </div>
          </form>
        </div>

        {normalized !== '' && <ScheduleInbox key={normalized} lessons={lessons} />}
      </div>
    </section>
  );
}

function defaultDay(lessons: readonly FoundLesson[]): DayNumber | null {
  if (lessons.length === 0) return null;

  const today = new Date().getDay();
  if (lessons.some((lesson) => lesson.weekNumber === today)) return today as DayNumber;
  return Math.min(...lessons.map((lesson) => lesson.weekNumber)) as DayNumber;
}

function ScheduleInbox({ lessons }: { lessons: readonly FoundLesson[] }) {
  const isWide = useMediaQuery(WIDE_QUERY);

  if (lessons.length === 0) {
    return (
      <div className="u-inbox">
        <p className="u-inbox-summary">
          Ничего не нашлось. Поиск идёт по фамилии преподавателя и номеру группы.
        </p>
      </div>
    );
  }

  return isWide ? <ScheduleSheet lessons={lessons} /> : <ScheduleDays lessons={lessons} />;
}

function ScheduleDays({ lessons }: { lessons: readonly FoundLesson[] }) {
  const [picked, setPicked] = useState<DayNumber | null>(null);

  const counts = WEEK_DAYS.map((day) => lessons.filter((l) => l.weekNumber === day.number).length);
  const activeDay = picked ?? defaultDay(lessons);
  const dayLessons = lessons
    .filter((lesson) => lesson.weekNumber === activeDay)
    .sort((a, b) => a.classTime - b.classTime);
  const activeName = WEEK_DAYS.find((day) => day.number === activeDay)?.name ?? '';

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'];
    if (!keys.includes(event.key)) return;

    const enabled = WEEK_DAYS.filter((_, i) => counts[i] > 0).map((day) => day.number);
    const index = enabled.findIndex((number) => number === activeDay);
    const delta = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    if (next === undefined) return;

    event.preventDefault();
    setPicked(next);
    event.currentTarget.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus();
  };

  return (
    <div className="u-inbox">
      <div className="u-inbox-days" role="tablist" aria-label="Дни недели" onKeyDown={onKeyDown}>
        {WEEK_DAYS.map((day, i) => (
          <button
            key={day.number}
            type="button"
            role="tab"
            data-day={day.number}
            className="u-day"
            aria-selected={day.number === activeDay}
            tabIndex={day.number === activeDay ? 0 : -1}
            disabled={counts[i] === 0}
            onClick={() => setPicked(day.number)}
          >
            <span className="u-day-name">{day.short}</span>
            <span className="u-day-count">{counts[i] > 0 ? counts[i] : '—'}</span>
          </button>
        ))}
      </div>

      <div className="u-inbox-list" role="tabpanel" aria-live="polite">
        <p className="u-inbox-summary">
          {`${activeName}: ${dayLessons.length} ${pluralize(dayLessons.length, ['пара', 'пары', 'пар'])} · всего найдено ${lessons.length}`}
        </p>
        {Array.from(new Set(dayLessons.map((lesson) => lesson.classTime))).flatMap((time) =>
          groupByDiscipline(dayLessons.filter((lesson) => lesson.classTime === time)).map((group) => (
            <LessonGroupRow key={group[0].id} lessons={group} />
          )),
        )}
      </div>
    </div>
  );
}

function LessonGroupRow({ lessons }: { lessons: readonly FoundLesson[] }) {
  const head = lessons[0];
  const details = [head.group, !head.byTeacher && head.teacher].filter(Boolean).join(' · ');

  return (
    <article className="u-mail">
      <span className="u-mail-time">
        {trimSeconds(classStartTime(head.classTime))}
        <small>{head.classTime}-я пара</small>
      </span>
      <div>
        <div className="u-mail-name">{head.name}</div>
        <div className="u-mail-meta">
          {head.type && <span className="u-mail-tag">{head.type}</span>}
          {details && <span>{details}</span>}
        </div>
        {lessons.map((lesson) => (
          <ScheduleLine key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </article>
  );
}
