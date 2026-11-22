import { Link } from 'react-router';

import { cn } from '@shared/lib';

import {
  type ExamDay,
  type ScheduledExam,
  formatConsultation,
  formatExamDay,
  formatExamTimeRange,
} from '../lib/exams';

interface ExamDayCardProps {
  day: ExamDay;
  isToday: boolean;
  /**
   * Адрес карточки преподавателя. Задан — у экзамена подписан
   * преподаватель ссылкой (сводная страница); не задан — не подписан
   * вовсе (карточка самого преподавателя, где имя уже стоит заголовком).
   */
  teacherHref?: (teacherId: number) => string;
}

/**
 * День сессии с его экзаменами. Чистый: день на входе, разметка на выходе.
 *
 * Один и тот же на карточке преподавателя и на сводной странице:
 * разница между ними — одна строка с преподавателем, и две карточки
 * на одни данные разошлись бы при первой же правке вёрстки.
 */
export function ExamDayCard({ day, isToday, teacherHref }: ExamDayCardProps) {
  const title = formatExamDay(day.day);

  return (
    <section
      aria-label={title}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        'flex flex-col gap-3 rounded border bg-white p-4',
        isToday ? 'border-primary' : 'border-gray-300',
      )}
    >
      <h3 className="text-base font-bold text-text-heading">
        {title}
        {isToday && <span className="ml-2 text-sm font-normal text-primary">сегодня</span>}
      </h3>

      <ul className="flex flex-col gap-3">
        {day.exams.map((exam) => (
          <li key={exam.id}>
            <ExamItem exam={exam} teacherHref={teacherHref} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Экзамен: время, название, группа с аудиторией, преподаватель
 * и консультация. Консультации нет — строки нет, а не «консультация: —».
 */
function ExamItem({
  exam,
  teacherHref,
}: {
  exam: ScheduledExam;
  teacherHref?: (teacherId: number) => string;
}) {
  return (
    <article className="flex flex-col gap-0.5">
      <p className="text-sm font-bold text-text-default">{formatExamTimeRange(exam)}</p>
      <p className="text-base leading-snug text-text-heading">{exam.name}</p>
      <p className="text-sm text-text-default">
        {exam.group} · ауд. {exam.cabinet}
      </p>
      {teacherHref && (
        <p className="text-sm">
          <Link to={teacherHref(exam.teacherId)} className="text-primary hover:underline">
            {exam.teacherName}
          </Link>
        </p>
      )}
      {exam.consultation && (
        <p className="text-sm text-text-muted">
          Консультация — {formatConsultation(exam.consultation, exam.date)}
        </p>
      )}
    </article>
  );
}
