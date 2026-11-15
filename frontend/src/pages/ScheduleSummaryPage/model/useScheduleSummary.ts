import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import {
  type ScheduleWeekState,
  type SummaryLesson,
  type SummaryTeacher,
  scheduleSummaryQuery,
  summaryLessons,
  summaryTeachers,
  useScheduleWeek,
} from "@entities/schedule";
import { teacherRoute } from "@shared/config/routes";

/** Имя query-параметра — контрактное, как у самой ручки. */
export const TEACHER_PARAM = "teacherId";

/** Что странице сводного расписания нужно знать о запросе, адресе и неделе. */
export type ScheduleSummaryState = {
  week: ScheduleWeekState<SummaryLesson>;
  /** Все, у кого есть пары, — для выбора. */
  teachers: readonly SummaryTeacher[];
  /** Выбранные и известные по ответу, в порядке выбора. */
  selected: readonly SummaryTeacher[];
  addTeacher: (id: number) => void;
  removeTeacher: (id: number) => void;
  clearTeachers: () => void;
  onlyWithCabinet: boolean;
  setOnlyWithCabinet: (value: boolean) => void;
  teacherHref: (teacherId: number) => string;
  isLoading: boolean;
  isOffline: boolean;
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  /** Расписание не загружено ни у кого. */
  isEmpty: boolean;
  /** В адресе преподаватели, но ни одного из них в сводной нет. */
  isSelectionUnknown: boolean;
  /** Пары есть, но после отбора не осталось ни одной ни в одну неделю. */
  isFilteredEmpty: boolean;
};

/**
 * `?teacherId=3&teacherId=7` — положительные целые без повторов,
 * в порядке адреса. Мусор отбрасывается молча: ссылка с опечаткой
 * в одном из `id` должна показать остальных, а не сломаться целиком.
 */
function parseTeacherIds(values: readonly string[]): number[] {
  const ids = values.map((value) => Number(value.trim()));
  return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

/**
 * Сводное расписание пар (F-57): все преподаватели кафедры в одной неделе.
 *
 * **Отбор по преподавателям — в адресе** (`?teacherId=`, имя параметра
 * контрактное): «расписание Чеканина и Ступивцева» — ссылка, которой
 * делятся, в отличие от недели. Но отбирает клиент, а не бэкенд —
 * разбор в `entities/schedule/api/scheduleApi.ts`. Переключение выбора
 * поэтому мгновенное и запросов не порождает.
 *
 * **«Только с аудиторией»** — галочка оригинала «Только очные занятия»,
 * переименованная под данные: контракт говорит лишь, что аудитория
 * «не указана», а очное это занятие или нет — не говорит. Галочка —
 * состояние страницы, а не адреса: это способ смотреть, а не то, на что
 * смотрят.
 *
 * Год, неделя, листание и подсказка под пустой неделей — общие
 * с карточкой преподавателя (`useScheduleWeek`).
 */
export function useScheduleSummary(): ScheduleSummaryState {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedIds = parseTeacherIds(searchParams.getAll(TEACHER_PARAM));

  const [onlyWithCabinet, setOnlyWithCabinet] = useState(false);

  const query = useQuery(scheduleSummaryQuery());
  const schedules = query.data ?? [];

  const teachers = summaryTeachers(schedules);
  const byId = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const selected = selectedIds.flatMap((id) => byId.get(id) ?? []);

  const lessons = summaryLessons(schedules, selectedIds).filter(
    (lesson) => !onlyWithCabinet || lesson.cabinet !== null,
  );
  const week = useScheduleWeek(lessons);

  const setTeacherIds = (ids: readonly number[]) => {
    // Прочие параметры адреса сохраняются: страница ими не пользуется,
    // но выкидывать чужое из адреса незачем.
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(TEACHER_PARAM);
      for (const id of ids) next.append(TEACHER_PARAM, String(id));
      return next;
    });
  };

  const isLoaded = query.data !== undefined;
  const isSelectionUnknown =
    isLoaded && selectedIds.length > 0 && selected.length === 0;

  return {
    week,
    teachers,
    selected,
    // Выбор строится от известных: неизвестный `id` из адреса пропадает
    // при первой же правке выбора, а не тянется за ним вечно.
    addTeacher: (id) => {
      if (!selected.some((teacher) => teacher.id === id)) {
        setTeacherIds([...selected.map((teacher) => teacher.id), id]);
      }
    },
    removeTeacher: (id) => {
      setTeacherIds(
        selected
          .filter((teacher) => teacher.id !== id)
          .map((teacher) => teacher.id),
      );
    },
    clearTeachers: () => {
      setTeacherIds([]);
    },
    onlyWithCabinet,
    setOnlyWithCabinet,
    teacherHref: teacherRoute,
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),
    isEmpty: isLoaded && teachers.length === 0,
    isSelectionUnknown,
    isFilteredEmpty:
      isLoaded &&
      teachers.length > 0 &&
      !isSelectionUnknown &&
      !week.hasLessons,
  };
}
