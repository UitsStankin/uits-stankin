import { useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { ArrowUpRight, CalendarDays, GraduationCap } from 'lucide-react';

import { pluralize } from '@shared/lib';
import { Button } from '@shared/ui/brand/Button';
import {
  WEEK_DAYS,
  classStartTime,
  findLessons,
  lessonPeriod,
  shortName,
  trimSeconds,
  type DayNumber,
  type FoundLesson,
} from '@entities/schedule';
import type { TeacherExams, TeacherSchedule } from '@shared/types';

import type { HomeListState } from '../model/useHomeContent';

const SCHEDULE_SUMMARY_ROUTE = '/educational-activities/schedule/schedule-summary';
const EXAMS_ROUTE = '/educational-activities/schedule/schedule-exams';

interface ScheduleBandProps {
  schedules: HomeListState<TeacherSchedule>;
  exams: HomeListState<TeacherExams>;
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

export function ScheduleBand({ schedules, exams, query, onQueryChange }: ScheduleBandProps) {
  const examCount = exams.items.reduce((sum, item) => sum + item.exams.length, 0);
  const lessons = findLessons(schedules.items, query);
  const normalized = query.trim().toLowerCase();

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
            onSubmit={(event) => event.preventDefault()}
          >
            <label htmlFor="sched-q" className="u-label">
              Преподаватель или группа
            </label>
            <div className="u-search">
              <input
                id="sched-q"
                type="search"
                autoComplete="off"
                placeholder="фамилия или номер группы"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <Button type="submit">Найти</Button>
            </div>

            <div className="u-chips u-picks">
              {schedules.items.map((schedule) => {
                const name = surname(schedule.teacherName);
                const isOn = normalized !== '' && name.toLowerCase() === normalized;
                return (
                  <button
                    key={schedule.teacherId}
                    type="button"
                    className={isOn ? 'u-chip u-is-on' : 'u-chip'}
                    aria-pressed={isOn}
                    onClick={() => onQueryChange(name)}
                  >
                    {shortName(schedule.teacherName)}
                  </button>
                );
              })}
            </div>
          </form>

          <div className="u-sched-side">
            <Link className="u-tile-link" to={SCHEDULE_SUMMARY_ROUTE}>
              <span className="u-tile-icon" aria-hidden>
                <CalendarDays size={22} />
              </span>
              <span className="u-tile-text">
                <strong>Сводное расписание преподавателей</strong>
                {schedules.items.length > 0 && <small>{schedules.items.length} преп.</small>}
              </span>
              <span className="u-tile-arrow" aria-hidden>
                <ArrowUpRight size={18} />
              </span>
            </Link>
            <Link className="u-tile-link" to={EXAMS_ROUTE}>
              <span className="u-tile-icon" aria-hidden>
                <GraduationCap size={22} />
              </span>
              <span className="u-tile-text">
                <strong>Расписание экзаменов</strong>
                {examCount > 0 && <small>{examCount} экз.</small>}
              </span>
              <span className="u-tile-arrow" aria-hidden>
                <ArrowUpRight size={18} />
              </span>
            </Link>
          </div>
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
  const [picked, setPicked] = useState<DayNumber | null>(null);

  if (lessons.length === 0) {
    return (
      <div className="u-inbox">
        <p className="u-inbox-summary">
          Ничего не нашлось. Поиск идёт по фамилии преподавателя и номеру группы.
        </p>
      </div>
    );
  }

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
        {dayLessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}

function LessonRow({ lesson }: { lesson: FoundLesson }) {
  const period = lessonPeriod(lesson);

  return (
    <article className="u-mail">
      <span className="u-mail-time">
        {trimSeconds(classStartTime(lesson.classTime))}
        <small>{lesson.classTime}-я пара</small>
      </span>
      <div>
        <div className="u-mail-name">{lesson.name}</div>
        <div className="u-mail-meta">
          {lesson.type && <span className="u-mail-tag">{lesson.type}</span>}
          {lesson.group && <span>{lesson.group}</span>}
          {lesson.subgroup && <span>подгруппа {lesson.subgroup}</span>}
          {lesson.cabinet && <span>ауд. {lesson.cabinet}</span>}
          {!lesson.byTeacher && <span>{lesson.teacher}</span>}
          {period && <span>{period}</span>}
        </div>
      </div>
    </article>
  );
}
