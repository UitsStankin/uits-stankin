import { NearestWeekNotice, WeekNavigation } from "@entities/schedule";
import StatusBlock from "@shared/ui/StatusBlock";
import { RetryButton } from "@shared/ui/StatusAction";

import { useScheduleSummary } from "./model/useScheduleSummary";
import { SummaryDay } from "./ui/SummaryDay";
import { SummarySkeleton } from "./ui/SummarySkeleton";
import { TeacherFilter } from "./ui/TeacherFilter";

/**
 * Сводное расписание преподавателей (F-57). Сборка: состояние из модели,
 * разметка из чистых компонентов.
 *
 * В оригинале это была недельная сетка `angular-calendar` по часам с
 * цветом на преподавателя и переключателем «неделя / день». Здесь — та же
 * неделя, но днями во всю ширину и парами по номерам (`ui/SummaryDay.tsx`):
 * сетка по часам с сотней событий в шести узких колонках нечитаема
 * на компьютере и не помещается в телефон, а пара в расписании и так
 * привязана к номеру, а не к минуте.
 *
 * Ширина `max-w-6xl`, как у расписания экзаменов.
 */
export default function ScheduleSummaryPage() {
  const state = useScheduleSummary();
  const {
    week,
    teachers,
    selected,
    addTeacher,
    removeTeacher,
    clearTeachers,
    onlyWithCabinet,
    setOnlyWithCabinet,
    teacherHref,
    isLoading,
    isOffline,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isSelectionUnknown,
    isFilteredEmpty,
  } = state;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">
        Сводное расписание преподавателей
      </h1>

      {teachers.length > 0 && (
        <TeacherFilter
          teachers={teachers}
          selected={selected}
          onAdd={addTeacher}
          onRemove={removeTeacher}
          onClear={clearTeachers}
          onlyWithCabinet={onlyWithCabinet}
          onOnlyWithCabinetChange={setOnlyWithCabinet}
        />
      )}

      {isLoading && <SummarySkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить сводное расписание"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Сводное расписание пока не загружено"
          description="Оно появится здесь, как только расписания преподавателей загрузят."
        />
      )}

      {/* Ссылка с преподавателем, которого нет: опечатка, архив или
          расписание сняли. Отличить нечем — поэтому «не найдено». */}
      {isSelectionUnknown && (
        <StatusBlock
          title="Расписание выбранных преподавателей не найдено"
          description="Возможно, оно ещё не загружено. Можно посмотреть расписание всех."
          action={
            <button
              type="button"
              onClick={clearTeachers}
              className="text-base font-bold text-primary hover:underline"
            >
              Показать всех
            </button>
          }
        />
      )}

      {isFilteredEmpty && (
        <StatusBlock
          title="Пар не найдено"
          description={
            onlyWithCabinet
              ? "Ни у одной пары выбранных преподавателей не указана аудитория."
              : "В расписании выбранных преподавателей нет ни одной пары."
          }
        />
      )}

      {week.hasLessons && (
        <>
          <WeekNavigation
            weekLabel={week.weekLabel}
            isCurrentWeek={week.isCurrentWeek}
            onPrevious={week.showPreviousWeek}
            onNext={week.showNextWeek}
            onCurrent={week.showCurrentWeek}
          />

          {week.nearestWeek ? (
            <NearestWeekNotice
              hint={week.nearestWeek}
              onShow={week.showNearestWeek}
            />
          ) : (
            <div className="flex flex-col gap-gutter-sm">
              {week.days.map((day) => (
                <SummaryDay
                  key={day.day}
                  day={day}
                  isToday={day.day === week.today}
                  teacherHref={teacherHref}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
