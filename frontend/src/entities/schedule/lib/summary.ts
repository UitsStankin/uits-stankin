import type { ClassTime, ScheduleLesson, TeacherSchedule } from '@shared/types';

/**
 * Сводное расписание (F-57): пары всех преподавателей одним списком.
 *
 * Ответ устроен по преподавателям, а смотрят его по времени: «что идёт
 * в среду третьей парой». Поэтому пары расплющиваются в один список
 * с подписанным преподавателем, разворачиваются в неделю тем же
 * `lessonsOfWeek`, что и на карточке, и внутри дня раскладываются по
 * номерам пар.
 */

/** Пара сводного расписания: пара контракта и чья она. */
export type SummaryLesson = ScheduleLesson & {
  teacherId: number;
  teacherName: string;
};

/** Преподаватель, у которого в сводной есть пары, — для выбора. */
export type SummaryTeacher = {
  id: number;
  name: string;
};

/** Пары одного номера в одном дне. */
export type LessonSlot<L extends ScheduleLesson = SummaryLesson> = {
  classTime: ClassTime;
  lessons: readonly L[];
};

/**
 * Пары выбранных преподавателей одним списком. Пустой выбор — все.
 * Порядок — ответа: преподаватели по фамилии, у каждого пары по дню
 * и номеру.
 */
export function summaryLessons(
  schedules: readonly TeacherSchedule[],
  teacherIds: readonly number[] = [],
): SummaryLesson[] {
  return schedules
    .filter((schedule) => teacherIds.length === 0 || teacherIds.includes(schedule.teacherId))
    .flatMap((schedule) =>
      schedule.lessons.map((lesson) => ({
        ...lesson,
        teacherId: schedule.teacherId,
        teacherName: schedule.teacherName,
      })),
    );
}

/**
 * Преподаватели с парами — в порядке ответа, то есть по фамилии.
 * Пустое расписание контракт в сводную не кладёт, но фильтр здесь
 * дешевле, чем пункт выбора, который ничего не покажет.
 */
export function summaryTeachers(schedules: readonly TeacherSchedule[]): SummaryTeacher[] {
  return schedules
    .filter((schedule) => schedule.lessons.length > 0)
    .map((schedule) => ({ id: schedule.teacherId, name: schedule.teacherName }));
}

/**
 * Пары дня по номерам, по возрастанию; номера без пар пропущены.
 * Внутри номера — порядок входа: в сводной это преподаватели по фамилии,
 * и порядок не прыгает от недели к неделе.
 */
export function lessonSlots<L extends ScheduleLesson>(lessons: readonly L[]): LessonSlot<L>[] {
  const slots = new Map<ClassTime, L[]>();
  for (const lesson of lessons) {
    const slot = slots.get(lesson.classTime);
    if (slot) slot.push(lesson);
    else slots.set(lesson.classTime, [lesson]);
  }

  return [...slots.entries()]
    .sort(([a], [b]) => a - b)
    .map(([classTime, slotLessons]) => ({ classTime, lessons: slotLessons }));
}
