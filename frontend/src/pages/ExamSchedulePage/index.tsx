import { ExamDayCard } from '@entities/schedule';
import { EXAM_SCHEDULE_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useExamSchedule } from './model/useExamSchedule';
import { ExamDaysSkeleton } from './ui/ExamDaysSkeleton';
import { ExamFiles } from './ui/ExamFiles';
import { GroupSelect } from './ui/GroupSelect';

/**
 * Расписание экзаменов (F-56). Сборка: состояние из модели, разметка
 * из чистых компонентов.
 *
 * В оригинале страница была сеткой `iframe` с PDF из карточек ППС.
 * Здесь сверху — экзамены, разобранные из PDF рассылки (T-48), по дням
 * и с выбором группы, а PDF из карточек — ссылками ниже: это разные
 * данные, и ни один источник другого не заменяет.
 *
 * Ширина `max-w-6xl`, как у списков: дни идут сеткой по три.
 */
export default function ExamSchedulePage() {
  const state = useExamSchedule();
  const {
    days,
    today,
    group,
    groups,
    setGroup,
    teacherHref,
    isLoading,
    isOffline,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isGroupEmpty,
    files,
  } = state;

  const hasFiles = files.nonGraduation.length > 0 || files.graduation.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Расписание экзаменов</h1>

      {/* Выбора нет, только когда выбирать не из чего: групп нет и ни одна
          не выбрана. При сбое он остаётся — выбранное переживёт «Повторить». */}
      {(groups.length > 0 || group !== '') && (
        <GroupSelect value={group} groups={groups} onChange={setGroup} />
      )}

      {isLoading && <ExamDaysSkeleton />}

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
          title="Не удалось загрузить расписание экзаменов"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Расписание экзаменов пока не загружено"
          description={
            hasFiles
              ? 'Ниже — расписания в PDF из карточек преподавателей.'
              : 'Оно появится здесь, как только его загрузят.'
          }
        />
      )}

      {/* Группа повторяется в тексте: выбор выше, а глаз уже внизу. Справочника
          групп нет, и опечатку от группы без экзаменов не отличить —
          поэтому «не найдено», а не «такой группы нет». */}
      {isGroupEmpty && (
        <StatusBlock
          title="Экзаменов не найдено"
          description={`У группы ${group} экзаменов в загруженном расписании нет.`}
          action={<ActionLink to={EXAM_SCHEDULE_ROUTE}>Показать все группы</ActionLink>}
        />
      )}

      {days.length > 0 && (
        <div className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2 lg:grid-cols-3">
          {days.map((day) => (
            <ExamDayCard
              key={day.day}
              day={day}
              isToday={day.day === today}
              teacherHref={teacherHref}
            />
          ))}
        </div>
      )}

      <ExamFiles files={files} />
    </div>
  );
}
