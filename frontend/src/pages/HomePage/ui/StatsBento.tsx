import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';

import { newsItemRoute } from '@shared/config/routes';
import { pluralize } from '@shared/lib';
import type { News, TeacherExams, TeacherSchedule } from '@shared/types';

import type { HomeListState } from '../model/useHomeContent';
import { AnchorLink } from './AnchorLink';

interface StatsBentoProps {
  schedules: HomeListState<TeacherSchedule>;
  exams: HomeListState<TeacherExams>;
  teachers: HomeListState<unknown>;
  news: HomeListState<News>;
  announcements: HomeListState<unknown>;
  conferences: HomeListState<unknown>;
  achievements: HomeListState<unknown>;
}

interface Stat {
  key: string;
  value: number;
  title: string;
  note: string;
  target: string;
}

const TONES = ['u-n1', 'u-n2', 'u-n3', 'u-n4'] as const;

function countLessons(schedules: readonly TeacherSchedule[]): number {
  return schedules.reduce((sum, schedule) => sum + schedule.lessons.length, 0);
}

function countExams(exams: readonly TeacherExams[]): number {
  return exams.reduce((sum, item) => sum + item.exams.length, 0);
}

function buildStats(props: StatsBentoProps): Stat[] {
  const lessons = countLessons(props.schedules.items);
  const exams = countExams(props.exams.items);
  const teachers = props.teachers.total;
  const posts = props.news.total + props.announcements.total;
  const events = props.conferences.total + props.achievements.total;
  const stats: Stat[] = [];

  if (lessons > 0) {
    const count = props.schedules.total;
    stats.push({
      key: 'lessons',
      value: lessons,
      title: pluralize(lessons, ['пара в расписании', 'пары в расписании', 'пар в расписании']),
      note: `${count} ${pluralize(count, ['преподаватель', 'преподавателя', 'преподавателей'])} с загруженным расписанием`,
      target: 'schedule',
    });
  }
  if (teachers > 0) {
    stats.push({
      key: 'teachers',
      value: teachers,
      title: pluralize(teachers, ['преподаватель', 'преподавателя', 'преподавателей']),
      note: 'карточки на сайте',
      target: 'people',
    });
  }
  if (exams > 0) {
    stats.push({
      key: 'exams',
      value: exams,
      title: pluralize(exams, ['экзамен', 'экзамена', 'экзаменов']),
      note: 'в расписании сессии',
      target: 'schedule',
    });
  }
  if (posts > 0) {
    stats.push({
      key: 'posts',
      value: posts,
      title: 'новостей и объявлений',
      note: `из них объявлений: ${props.announcements.total}`,
      target: 'news',
    });
  }
  if (events > 0) {
    stats.push({
      key: 'events',
      value: events,
      title: 'мероприятия и достижения',
      note: `конференций: ${props.conferences.total}, достижений: ${props.achievements.total}`,
      target: 'events',
    });
  }

  return stats;
}

export function StatsBento(props: StatsBentoProps) {
  const stats = buildStats(props);
  if (stats.length === 0) return null;

  const photoNews = props.news.items.find((item) => item.previewImageUrl);

  return (
    <section id="numbers" className="u-wrap u-numbers" aria-labelledby="h-numbers">
      <h2 id="h-numbers" className="u-section-title u-small">
        Кафедра в&nbsp;цифрах
      </h2>
      <div className={photoNews ? 'u-stats u-has-photo' : 'u-stats'}>
        {photoNews?.previewImageUrl && (
          <Link to={newsItemRoute(photoNews.id)} className="u-stat-photo">
            <img
              src={photoNews.previewImageUrl}
              alt={photoNews.previewImageDescription ?? ''}
              loading="lazy"
              decoding="async"
            />
            <span className="u-stat-photo-text">
              <small>Свежая новость</small>
              <strong>{photoNews.title}</strong>
            </span>
          </Link>
        )}
        <ul className="u-stat-list">
          {stats.map((stat, index) => (
            <li key={stat.key}>
              <AnchorLink target={stat.target} className="u-stat">
                <span className={`u-stat-num ${TONES[index % TONES.length]}`}>{stat.value}</span>
                <span className="u-stat-text">
                  <strong>{stat.title}</strong>
                  <small>{stat.note}</small>
                </span>
                <ArrowUpRight className="u-stat-arrow" size={20} aria-hidden />
              </AnchorLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
