import { Link } from "react-router";

import {
  type ScheduleDay,
  type SummaryLesson,
  classTimeRange,
  formatScheduleDay,
  lessonSlots,
} from "@entities/schedule";
import { cn } from "@shared/lib";

interface SummaryDayProps {
  day: ScheduleDay<SummaryLesson>;
  isToday: boolean;
  teacherHref: (teacherId: number) => string;
}

/**
 * День сводного расписания. Чистый: день на входе, разметка на выходе.
 *
 * **Во всю ширину, а не сеткой по три, как на карточке преподавателя.**
 * У одного преподавателя в дне три-четыре пары, у кафедры — десятки,
 * и три колонки по сорок пар — это стена, где пары одного номера
 * разбросаны по экрану. Здесь внутри дня пары собраны по номерам:
 * «третья пара» — строка, в ней карточки всех, кто в это время ведёт.
 * На телефоне номер встаёт над своими карточками.
 *
 * День без пар остаётся с надписью, как на карточке: выпавшая среда
 * читалась бы как сбой, а не как «пар нет».
 */
export function SummaryDay({ day, isToday, teacherHref }: SummaryDayProps) {
  const title = formatScheduleDay(day);
  const slots = lessonSlots(day.lessons);

  return (
    <section
      aria-label={title}
      aria-current={isToday ? "date" : undefined}
      className={cn(
        "flex flex-col gap-4 rounded border bg-white p-4 md:p-6",
        isToday ? "border-primary" : "border-gray-300",
      )}
    >
      <h2 className="text-h5 text-text-heading">
        {title}
        {isToday && (
          <span className="ml-2 text-sm font-normal text-primary">сегодня</span>
        )}
      </h2>

      {slots.length === 0 ? (
        <p className="text-sm text-text-muted">Пар нет</p>
      ) : (
        <div className="flex flex-col gap-4">
          {slots.map((slot) => (
            <section
              key={slot.classTime}
              aria-label={`${String(slot.classTime)} пара`}
              className="flex flex-col gap-2 border-t border-gray-200 pt-4 first:border-t-0 first:pt-0 lg:flex-row lg:gap-6"
            >
              <h3 className="flex shrink-0 gap-2 text-sm lg:w-28 lg:flex-col lg:gap-0">
                <span className="font-bold text-text-heading">
                  {slot.classTime} пара
                </span>
                <span className="text-text-muted">
                  {classTimeRange(slot.classTime)}
                </span>
              </h3>

              <ul className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {slot.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <LessonCard lesson={lesson} teacherHref={teacherHref} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Пара: преподаватель ссылкой, название, вид, группа с подгруппой
 * и аудитория. Время не повторяется — оно стоит у номера пары.
 * Незаполненная аудитория не подписывается, как на карточке.
 */
function LessonCard({
  lesson,
  teacherHref,
}: {
  lesson: SummaryLesson;
  teacherHref: (teacherId: number) => string;
}) {
  const group = lesson.subgroup
    ? `${lesson.group}, подгруппа ${lesson.subgroup}`
    : lesson.group;

  return (
    <article className="flex h-full flex-col gap-0.5 rounded bg-gray-100 px-3 py-2">
      <Link
        to={teacherHref(lesson.teacherId)}
        className="text-sm font-bold text-primary hover:underline"
      >
        {lesson.teacherName}
      </Link>
      <p className="text-sm leading-snug text-text-heading">{lesson.name}</p>
      <p className="text-sm text-text-muted">
        {lesson.type} · {group}
        {lesson.cabinet && <> · ауд. {lesson.cabinet}</>}
      </p>
    </article>
  );
}
