/**
 * Расписание пар преподавателя — `ScheduleResponseDto` бэкенда
 * (docs/API.md, «Импорт расписания преподавателя» и «Расписание
 * преподавателя: публичное чтение»). Одна схема на импорт, чтение одного
 * преподавателя и сводную выборку.
 *
 * Переехало из `planned.types.ts`, где лежала форма старого портала:
 * у неё были `id` расписания, `teacher` вместо `teacherId` и `teacherId`
 * внутри каждой пары. Ничего из этого контракт не отдаёт, а `teacherName`,
 * которого там не было, отдаёт.
 */

/**
 * Номер пары в дне, 1–8. Время начала и конца — фиксированная таблица
 * (`entities/schedule/lib/classTimes.ts`), в ответе его нет.
 */
export type ClassTime = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** День недели: 1 — понедельник … 6 — суббота. Воскресенья в сетке нет. */
export type WeekDay = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Дата или период проведения пары.
 *
 * Даты в формате `ДД.ММ` **без года**: его нет в исходном PDF,
 * и восстанавливать год — работа клиента (docs/API.md, «Даты»).
 */
export type ScheduleLessonDate = {
  /** Меняется при переимпорте: годится в `key`, хранить дольше ответа нельзя. */
  id: number;
  /** `ДД.ММ`. */
  startDate: string;
  /** `ДД.ММ`; `null` — разовое занятие в `startDate`. */
  endDate: string | null;
  /** `true` — через неделю (`ч.н.`), `false` — каждую неделю (`к.н.`). */
  alternativelyPeriod: boolean;
};

/** Пара в недельной сетке. У одной пары несколько периодов — норма. */
export type ScheduleLesson = {
  id: number;
  weekNumber: WeekDay;
  classTime: ClassTime;
  /** Как в PDF: у лекции потоку — перечень групп через запятую. */
  group: string;
  name: string;
  /** «Лекция», «Семинар», «Лабораторная» — свободная строка из PDF. */
  type: string;
  /** Буква без скобок (`А`, `Б`) либо `null`. */
  subgroup: string | null;
  /** `216`, `0804(КК)`, `ИГ-2` либо `null`, если не указана. */
  cabinet: string | null;
  dates: readonly ScheduleLessonDate[];
};

/**
 * Расписание одного преподавателя. Не загружено — `lessons: []`, а не `404`:
 * `404` у ручки только за несуществующим преподавателем.
 */
export type TeacherSchedule = {
  teacherId: number;
  /** ФИО через пробел, незаполненные части пропущены. */
  teacherName: string;
  lessons: readonly ScheduleLesson[];
};
