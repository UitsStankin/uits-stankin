import type { Exam, ExamConsultation, TeacherExamSchedule } from '@shared/types';

import {
  type CalendarDay,
  formatDayMonth,
  formatDayMonthYear,
  formatWeekDay,
  parseIsoDate,
} from './calendarDay';

/** Экзамен вместе с тем, кто его принимает: сводной странице это нужно. */
export type ScheduledExam = Exam & {
  teacherId: number;
  teacherName: string;
};

/** День сессии со своими экзаменами — по времени начала. */
export type ExamDay = {
  day: CalendarDay;
  exams: readonly ScheduledExam[];
};

/**
 * Экзамены всех переданных преподавателей, разложенные по дням.
 *
 * Ответ сводной ручки устроен по преподавателям, а смотрят его по датам:
 * студент ищет «что у моей группы и когда», и экзамены одного дня у разных
 * преподавателей должны стоять рядом. Карточке преподавателя та же
 * раскладка нужна по той же причине — два экзамена в один день у разных
 * групп в оригинальных рассылках обычное дело.
 *
 * Внутри дня — по времени начала, затем по преподавателю, чтобы порядок
 * не зависел от порядка в ответе. Время сравнивается строкой: `ЧЧ:ММ`
 * с ведущим нулём сортируется так же, как числа.
 *
 * Экзамен с датой, которая не разбирается, пропускается. У бэкенда это
 * `LocalDate`, и такого не бывает; правило нужно, чтобы одна битая строка
 * не уронила всю страницу, если формат когда-нибудь поменяется.
 */
export function examDays(schedules: readonly TeacherExamSchedule[]): ExamDay[] {
  const byDay = new Map<CalendarDay, ScheduledExam[]>();

  for (const { teacherId, teacherName, exams } of schedules) {
    for (const exam of exams) {
      const day = parseIsoDate(exam.date);
      if (day === null) continue;

      const list = byDay.get(day) ?? [];
      list.push({ ...exam, teacherId, teacherName });
      byDay.set(day, list);
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, exams]) => ({
      day,
      exams: exams.sort(
        (a, b) =>
          a.timeStart.localeCompare(b.timeStart) ||
          a.teacherName.localeCompare(b.teacherName, 'ru') ||
          a.id - b.id,
      ),
    }));
}

/**
 * Коды групп для выбора на сводной странице — каждый по отдельности,
 * без повторов, в естественном порядке (`ИДБ-21-9` раньше `ИДБ-21-10`).
 *
 * Экзамен потока несёт несколько кодов через запятую, и в выборе они
 * обязаны стоять поодиночке: бэкенд сравнивает с фильтром каждый код
 * отдельно, и `?group=ИДБ-21-10` найдёт экзамен `ИДБ-21-09, ИДБ-21-10`.
 * Пункт «ИДБ-21-09, ИДБ-21-10» в выборе ничего бы не нашёл.
 *
 * Повторы отсеиваются без учёта регистра — по тому же правилу, по какому
 * бэкенд сравнивает группу; в списке остаётся первое встреченное написание.
 */
export function examGroups(schedules: readonly TeacherExamSchedule[]): string[] {
  const groups = new Map<string, string>();

  for (const { exams } of schedules) {
    for (const exam of exams) {
      for (const raw of exam.group.split(',')) {
        const group = raw.trim();
        if (group === '') continue;
        const key = group.toLocaleLowerCase('ru');
        if (!groups.has(key)) groups.set(key, group);
      }
    }
  }

  return [...groups.values()].sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}

/**
 * Время из ответа — `ЧЧ:ММ`. Контракт обещает ровно это, но `LocalTime`
 * у Jackson с ненулевыми секундами пишется `ЧЧ:ММ:СС`, и секунды
 * на странице расписания были бы мусором.
 */
export function formatExamTime(time: string): string {
  return time.slice(0, 5);
}

/** «16:00–21:10». */
export function formatExamTimeRange(exam: Pick<Exam, 'timeStart' | 'timeEnd'>): string {
  return `${formatExamTime(exam.timeStart)}–${formatExamTime(exam.timeEnd)}`;
}

/** «Четверг, 15 мая 2025 г.» — заголовок дня сессии. */
export function formatExamDay(day: CalendarDay): string {
  const weekDay = formatWeekDay(day);
  return `${weekDay.charAt(0).toLocaleUpperCase('ru')}${weekDay.slice(1)}, ${formatDayMonthYear(day)}`;
}

/**
 * «14 мая, 16:00, ауд. 308». Год ставится, только если он не тот же,
 * что у экзамена: консультация 28 декабря к экзамену 9 января без года
 * читалась бы как консультация после экзамена.
 */
export function formatConsultation(consultation: ExamConsultation, examDate: string): string {
  const day = parseIsoDate(consultation.date);
  const sameYear = consultation.date.slice(0, 4) === examDate.slice(0, 4);
  const date =
    day === null ? consultation.date : sameYear ? formatDayMonth(day) : formatDayMonthYear(day);

  return `${date}, ${formatExamTime(consultation.time)}, ауд. ${consultation.cabinet}`;
}
