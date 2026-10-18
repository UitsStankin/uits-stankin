/**
 * Расписание пар и экзаменов — по контракту T-39…T-42b (docs/API.md,
 * «Расписание преподавателя», «Сводное расписание», «Расписание экзаменов»).
 *
 * Типы переехали из `planned.types.ts` по правилу из его шапки: ручки
 * появились, формы сверены с ответом бэкенда. Против прежней заготовки
 * изменилось многое: расписание приходит по одному объекту на преподавателя
 * с именем внутри (`teacherName`), а не парой `id` / `teacher`, и у пары нет
 * `teacherId` — он известен из объекта-родителя.
 */

/** Номер пары в дне, 1–8. */
export type ClassTime = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** День недели, 1 — понедельник, 6 — суббота. Воскресенья в сетке нет. */
export type WeekDay = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Дата или период проведения занятия.
 *
 * `startDate` и `endDate` приходят в формате `ДД.ММ` — без года: года нет
 * в исходном PDF, и восстановить его нечем.
 */
export type ScheduleLessonDate = {
  id: number;
  startDate: string;
  /** `null` — разовое занятие в `startDate`, а не период. */
  endDate: string | null;
  /** Через неделю, а не каждую (в PDF — «ч.н.»). */
  alternativelyPeriod: boolean;
};

/** Пара в сетке расписания. */
export type ScheduleLesson = {
  id: number;
  weekNumber: WeekDay;
  classTime: ClassTime;
  /** Строка как в PDF; у лекции потоку — перечень групп через запятую. */
  group: string;
  name: string;
  /** Лекция, семинар, лабораторная — свободная строка. */
  type: string;
  /** Буква без скобок (`А`, `Б`) или `null`. */
  subgroup: string | null;
  /** Как в расписании (`216`, `0804(КК)`) или `null`, если не указана. */
  cabinet: string | null;
  dates: readonly ScheduleLessonDate[];
};

/** Расписание одного преподавателя — элемент `GET /api/public/schedule`. */
export type TeacherSchedule = {
  teacherId: number;
  /** Фамилия, имя и отчество через пробел. */
  teacherName: string;
  lessons: readonly ScheduleLesson[];
};

/** Консультация перед экзаменом. */
export type ExamConsultation = {
  /** `ГГГГ-ММ-ДД`; год может отличаться от года экзамена. */
  date: string;
  time: string;
  cabinet: string;
};

/**
 * Экзамен.
 *
 * Время по документу приходит как `ЧЧ:ММ`, но бэкенд сейчас отдаёт
 * `ЧЧ:ММ:СС` (замечено при переносе главной) — показывать нужно обе формы
 * одинаково, см. `entities/schedule/lib/schedulePresenters.ts`.
 */
export type Exam = {
  id: number;
  /** `ГГГГ-ММ-ДД`. */
  date: string;
  timeStart: string;
  timeEnd: string;
  /** Код группы; у нескольких групп — через запятую. */
  group: string;
  name: string;
  cabinet: string;
  consultation: ExamConsultation | null;
};

/** Экзамены одного преподавателя — элемент `GET /api/public/exams`. */
export type TeacherExams = {
  teacherId: number;
  teacherName: string;
  exams: readonly Exam[];
};
