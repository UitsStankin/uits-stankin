import { pluralize } from '@shared/lib';
import type { TeacherExams, TeacherSchedule } from '@shared/types';

import type { HomeListState } from '../model/useHomeContent';
import { AnchorLink } from './AnchorLink';

interface StatsBentoProps {
  schedules: HomeListState<TeacherSchedule>;
  exams: HomeListState<TeacherExams>;
  teachers: HomeListState<unknown>;
  news: HomeListState<unknown>;
  announcements: HomeListState<unknown>;
  conferences: HomeListState<unknown>;
  achievements: HomeListState<unknown>;
}

interface Cell {
  key: string;
  value: number;
  title: string;
  note: string;
  target: string;
  tone: string;
  big?: boolean;
}

function countLessons(schedules: readonly TeacherSchedule[]): number {
  return schedules.reduce((sum, schedule) => sum + schedule.lessons.length, 0);
}

function countExams(exams: readonly TeacherExams[]): number {
  return exams.reduce((sum, item) => sum + item.exams.length, 0);
}

function buildCells(props: StatsBentoProps): Cell[] {
  const lessons = countLessons(props.schedules.items);
  const exams = countExams(props.exams.items);
  const teachers = props.teachers.total;
  const posts = props.news.total + props.announcements.total;
  const events = props.conferences.total + props.achievements.total;
  const cells: Cell[] = [];

  if (lessons > 0) {
    const count = props.schedules.total;
    cells.push({
      key: 'lessons',
      value: lessons,
      title: pluralize(lessons, ['пара в расписании', 'пары в расписании', 'пар в расписании']),
      note: `${count} ${pluralize(count, ['преподаватель', 'преподавателя', 'преподавателей'])} с загруженным расписанием`,
      target: 'schedule',
      tone: 'n1',
      big: true,
    });
  }
  if (teachers > 0) {
    cells.push({
      key: 'teachers',
      value: teachers,
      title: pluralize(teachers, ['преподаватель', 'преподавателя', 'преподавателей']),
      note: 'карточки на сайте',
      target: 'people',
      tone: 'n2',
    });
  }
  if (exams > 0) {
    cells.push({
      key: 'exams',
      value: exams,
      title: pluralize(exams, ['экзамен', 'экзамена', 'экзаменов']),
      note: 'в расписании сессии',
      target: 'schedule',
      tone: 'n3',
    });
  }
  if (posts > 0) {
    cells.push({
      key: 'posts',
      value: posts,
      title: 'новостей и объявлений',
      note: `из них объявлений: ${props.announcements.total}`,
      target: 'news',
      tone: 'n4',
    });
  }
  if (events > 0) {
    cells.push({
      key: 'events',
      value: events,
      title: 'мероприятия и достижения',
      note: `конференций: ${props.conferences.total}, достижений: ${props.achievements.total}`,
      target: 'events',
      tone: 'n2',
    });
  }

  return cells;
}

export function StatsBento(props: StatsBentoProps) {
  const cells = buildCells(props);
  if (cells.length === 0) return null;

  return (
    <section id="numbers" className="u-wrap u-numbers" aria-labelledby="h-numbers">
      <h2 id="h-numbers" className="u-section-title u-small">
        Кафедра в&nbsp;цифрах
      </h2>
      <div className="u-bento">
        {cells.map((cell) => (
          <AnchorLink
            key={cell.key}
            target={cell.target}
            className={cell.big ? 'u-bento-cell u-big' : 'u-bento-cell'}
          >
            <span className={`u-bento-num u-${cell.tone}`}>{cell.value}</span>
            <span className="u-bento-label">
              <strong>{cell.title}</strong>
              {cell.note}
            </span>
          </AnchorLink>
        ))}
      </div>
    </section>
  );
}
