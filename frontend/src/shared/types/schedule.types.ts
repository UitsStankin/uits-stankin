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

/**
 * Консультация перед экзаменом — `ConsultationResponseDto`. Половинчатой
 * не бывает: либо все три поля, либо вместо объекта `null` (это же
 * ограничение стоит в базе).
 */
export type ExamConsultation = {
  /**
   * ISO, `ГГГГ-ММ-ДД`. Год бывает другим, чем у экзамена: консультация
   * 28.12 к экзамену 09.01.
   */
  date: string;
  /** `ЧЧ:ММ`. */
  time: string;
  cabinet: string;
};

/**
 * Экзамен, разобранный из PDF рассылки, — `ExamResponseDto`
 * (docs/API.md, «Импорт расписания экзаменов преподавателя»).
 *
 * В отличие от пар, год здесь есть: он написан в самом документе.
 * Дня недели в ответе нет — он выводится из `date`.
 */
export type Exam = {
  /** Меняется при переимпорте: годится в `key`, хранить дольше ответа нельзя. */
  id: number;
  /** ISO, `ГГГГ-ММ-ДД`. */
  date: string;
  /** `ЧЧ:ММ` с ведущим нулём. */
  timeStart: string;
  timeEnd: string;
  /** Код группы; у экзамена нескольких групп — через запятую. */
  group: string;
  name: string;
  /** Как в документе: `209`, `306(а)`, `0402`. Скобка — литера, не подгруппа. */
  cabinet: string;
  consultation: ExamConsultation | null;
};

/**
 * Экзамены одного преподавателя — `ExamScheduleResponseDto`. Одна схема
 * на импорт, чтение одного преподавателя и сводную выборку, как у пар.
 * Не загружено — `exams: []`, а не `404`.
 */
export type TeacherExamSchedule = {
  teacherId: number;
  teacherName: string;
  /** По дате и времени начала — порядок задаёт бэкенд. */
  exams: readonly Exam[];
};

/**
 * Ссылки на PDF с расписанием экзаменов из карточки ППС —
 * `ExamScheduleFilesResponseDto` (`GET /api/public/exams/files`).
 * С разобранными экзаменами не связаны: это перенос того, как экзамены
 * показывал старый портал. Хотя бы одна ссылка заполнена всегда —
 * преподаватель с двумя `null` в выдачу не попадает.
 */
export type ExamScheduleFiles = {
  teacherId: number;
  teacherName: string;
  /** Выпускные курсы. */
  examScheduleGraduation: string | null;
  /** Невыпускные курсы. */
  examScheduleNonGraduation: string | null;
};
