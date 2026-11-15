import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { scheduleKeys, teacherExamsQuery, teacherScheduleQuery } from '@entities/schedule';

import { importTeacherExams, importTeacherSchedule } from '../api/scheduleImportApi';
import {
  type ImportKind,
  checkImportFile,
  confirmText,
  countText,
  importErrorMessage,
} from '../lib/importText';

/** Итог последней попытки по одному документу — показывается под его строкой. */
export type ImportOutcome = { tone: 'success'; text: string } | { tone: 'error'; text: string };

/** Что загружено сейчас: число записей, «не знаем» или «ещё читаем». */
export type CurrentState =
  | { status: 'loading' }
  | { status: 'unknown' }
  | { status: 'ready'; count: number };

/**
 * Импорт PDF расписаний одного преподавателя — пар и экзаменов.
 *
 * Одним хуком на оба документа, а не хуком на документ: окно
 * подтверждения на странице одно, и запрос в полёте тоже один — пока
 * разбирается один PDF, второй выбрать нельзя. Порознь эти два признака
 * жили бы в двух копиях и договаривались бы через страницу.
 *
 * Путь такой: выбор файла → проверка размера на месте → окно с тем, что
 * пропадёт → запрос → итог строкой под документом. Итог — строкой,
 * а не тостом: отказ `400` несёт причину словами сервера (день, пару,
 * поле), и читать её модератору предстоит, держа PDF открытым рядом, —
 * тост за это время уже исчезнет.
 *
 * Текущее расписание читается публичными ручками — теми же, что у карточки
 * на сайте, и из того же кэша. Нужно оно ради одного числа в окне:
 * «будет удалено 24 занятия» предупреждает, а «будет удалено текущее
 * расписание» — нет.
 *
 * После импорта сбрасывается весь кэш расписаний (`scheduleKeys.all`):
 * новое расписание меняет и карточку преподавателя, и обе сводные.
 */
export function useScheduleImport(teacherId: number) {
  const queryClient = useQueryClient();

  const lessons = useQuery({
    ...teacherScheduleQuery(teacherId),
    select: (schedule) => schedule.lessons.length,
  });
  const exams = useQuery({
    ...teacherExamsQuery(teacherId),
    select: (schedule) => schedule.exams.length,
  });

  const [confirming, setConfirming] = useState<{ kind: ImportKind; file: File } | null>(null);
  const [outcomes, setOutcomes] = useState<Record<ImportKind, ImportOutcome | null>>({
    lessons: null,
    exams: null,
  });

  const setOutcome = (kind: ImportKind, outcome: ImportOutcome | null) =>
    setOutcomes((previous) => ({ ...previous, [kind]: outcome }));

  const mutation = useMutation({
    mutationFn: async ({ kind, file }: { kind: ImportKind; file: File }) =>
      kind === 'lessons'
        ? (await importTeacherSchedule(teacherId, file)).lessons.length
        : (await importTeacherExams(teacherId, file)).exams.length,

    onSuccess: (count, { kind, file }) => {
      void queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      setOutcome(kind, {
        tone: 'success',
        text: `Загружено из «${file.name}»: ${countText(kind, count)}.`,
      });
    },

    onError: (error, { kind }) => {
      setOutcome(kind, { tone: 'error', text: importErrorMessage(kind, error) });
    },

    // Окно держится открытым, пока идёт разбор: он бывает долгим,
    // а закрывшееся окно без итога выглядело бы как «ничего не произошло».
    onSettled: () => setConfirming(null),
  });

  const current: Record<ImportKind, CurrentState> = {
    lessons: currentState(lessons),
    exams: currentState(exams),
  };

  const confirmingState = confirming ? current[confirming.kind] : null;
  const confirmingCount = confirmingState?.status === 'ready' ? confirmingState.count : null;

  return {
    current,
    outcomes,

    /** Какой документ сейчас разбирается; `null` — ни один. */
    pendingKind: mutation.isPending ? mutation.variables.kind : null,

    /**
     * Файл выбран. Негодный по размеру отклоняется сразу и до окна
     * не доходит: спрашивать «заменить?» про файл, который сервер точно
     * не примет, значит обещать замену, которой не будет.
     */
    selectFile: (kind: ImportKind, file: File) => {
      const problem = checkImportFile(file);
      if (problem) {
        setOutcome(kind, { tone: 'error', text: problem });
        return;
      }
      setOutcome(kind, null);
      setConfirming({ kind, file });
    },

    /** Открытое окно подтверждения; `null` — окна нет. */
    confirmation: confirming && {
      kind: confirming.kind,
      description: confirmText(confirming.kind, confirming.file.name, confirmingCount),
    },
    confirm: () => {
      if (confirming) mutation.mutate(confirming);
    },
    cancel: () => setConfirming(null),
    isImporting: mutation.isPending,
  };
}

function currentState(query: { isLoading: boolean; data: number | undefined }): CurrentState {
  if (query.data !== undefined) return { status: 'ready', count: query.data };
  if (query.isLoading) return { status: 'loading' };
  return { status: 'unknown' };
}
