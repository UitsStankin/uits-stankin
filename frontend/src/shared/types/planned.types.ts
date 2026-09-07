/**
 * Модели действующего сайта, у которых в новом контракте **ещё нет ручки**.
 *
 * Перенесены из `shared/types/models/` Angular-оригинала: набор полей взят
 * из работающей системы, придумывать его заново незачем. Приведены к новым
 * соглашениям — snake_case развёрнут в camelCase, классы с конструкторами
 * стали `type` (инстансы классов ломают structural sharing в TanStack Query).
 *
 * Файл отдельный намеренно. Всё, что лежит в `auth`, `news`, `staff`
 * и `api`, сверено со Swagger и existing DTO — на эти типы можно опираться.
 * Здесь же лежат **несверенные** формы, и причины у них теперь разные
 * (матрица паритета в docs/MIGRATION.md §3): у Telegram модуля нет и не
 * будет — п. 20 снят решением, — а расписание (пп. 10–12) на бэкенде уже
 * приехало с T-39…T-42b, но тип попал сюда раньше и со Swagger не сверялся.
 * Так что «как Spring назовёт поля» здесь означает и «неоткуда знать»,
 * и «известно, но не сверено» — опираться нельзя ни на то, ни на другое.
 * Путь импорта об этом и предупреждает: `planned.types` в шапке файла
 * видно на код-ревью.
 *
 * Правило: когда модуль появляется на бэкенде — тип **сверяется со Swagger**,
 * переезжает в свой `*.types.ts` и удаляется отсюда. Не наоборот.
 */

/**
 * Номер пары в дне, 1–8. Соответствие номера часам начала и конца — таблица
 * в оригинальном `schedule.ts`; она понадобится виджету расписания, но это
 * не тип, а данные, и приедет вместе с ним.
 */
export type ClassTime = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** День недели, 1 — понедельник, 6 — суббота. Воскресенья в сетке нет. */
export type WeekDay = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Дата или период проведения занятия. Матрица паритета, п. 10.
 *
 * `startDate` и `endDate` приходят в формате `DD.MM` — без года: сетка
 * повторяется каждый учебный год.
 */
export type ScheduleLessonDate = {
  id: number;
  /** `DD.MM`. */
  startDate: string;
  /** `DD.MM`; `null` — занятие в один день, а не период. */
  endDate: string | null;
  /** Через неделю, а не каждую. */
  alternativelyPeriod: boolean;
};

/** Занятие в сетке расписания. */
export type ScheduleLesson = {
  id: number;
  name: string;
  group: string;
  /** Лекция, практика, лабораторная — свободная строка. */
  type: string;
  subgroup: string | null;
  cabinet: string | null;
  classTime: ClassTime;
  weekNumber: WeekDay;
  dates: readonly ScheduleLessonDate[];
  teacherId: number;
};

/** Расписание преподавателя: одно на преподавателя. */
export type Schedule = {
  id: number;
  /** Идентификатор преподавателя. */
  teacher: number;
  lessons: readonly ScheduleLesson[];
};

/**
 * Привязка Telegram к учётной записи. Матрица паритета, п. 20.
 *
 * Из профиля поля Telegram убраны до появления модуля: `UserResponseDto`
 * их не отдаёт, хотя колонка `telegram_code` в таблице есть.
 */
export type TelegramUser = {
  id: number;
  userId: number;
  username: string;
  chatId: number;
  /** Пользователь портала, к которому привязан чат. */
  assignedUser: number;
};
