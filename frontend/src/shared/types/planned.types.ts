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
 * Здесь же лежат **несверенные** формы: соответствующих модулей на бэкенде
 * нет (матрица паритета в docs/MIGRATION.md §3, пункты 6, 9–14, 20),
 * и как Spring назовёт поля, сегодня знать неоткуда. Путь импорта об этом
 * и предупреждает: `planned.types` в шапке файла видно на код-ревью.
 *
 * Правило: когда модуль появляется на бэкенде — тип **сверяется со Swagger**,
 * переезжает в свой `*.types.ts` и удаляется отсюда. Не наоборот.
 */

/**
 * Достижение кафедры, привязанное к преподавателю.
 * Матрица паритета, п. 6. Тикет фронта — F-25.
 *
 * В оригинале это была пара классов `ListAchievement` и `Achievement`:
 * список без тела записи, деталь — с телом. Пара сохранена, но выражена
 * через `Omit`, а не наследованием.
 */
export type Achievement = {
  id: number;
  title: string;
  /** Краткое описание для карточки в списке. */
  description: string;
  /** Rich-text, HTML. */
  content: string;
  /** Путь к картинке. */
  image: string;
  createdAt: string;
  isPublished: boolean;
  /** Имя преподавателя, готовое к показу. */
  teacher: string;
  teacherId: number;
};

/** Элемент списка достижений — то же самое без тела записи. */
export type AchievementListItem = Omit<Achievement, 'content'>;

/**
 * Аспирант и его научный руководитель. Матрица паритета, п. 14.
 * Тикет фронта — F-34.
 */
export type GraduateStudent = {
  id: number;
  student: {
    fullName: string;
    diplomaTheme: string;
    speciality: string;
    admissionYear: number;
  };
  teacher: {
    fullName: string;
  };
};

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

/**
 * Человек на странице «Благодарности» (тикет F-33).
 *
 * Ручки не будет вовсе: это статический список из десятка карточек,
 * он живёт в коде страницы рядом с фотографиями в `public/assets/images`.
 * Тип лежит здесь по той же причине — сверять его не с чем.
 */
export type Contributor = {
  id: number;
  name: string;
  description: string;
  image: string;
};
