import { FileText } from 'lucide-react';

import { ExamDayCard } from '@entities/schedule';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

import type { TeacherExamsState } from '../model/useTeacherExams';

interface TeacherExamsProps {
  state: TeacherExamsState;
  /** Ссылки на PDF из самой карточки — их приносит запрос карточки, не этот. */
  graduationPdf: string | null;
  nonGraduationPdf: string | null;
}

/**
 * Блок «Расписание экзаменов» на карточке преподавателя. Чистый.
 *
 * Собирает два источника в одном месте: разобранные экзамены (F-56) и
 * ссылки на PDF, которые модератор вписывает в карточку. До F-56 ссылки
 * жили разделом профиля с тем же заголовком, и два раздела «экзамены»
 * на одной странице посетитель читал бы как дубль.
 *
 * Пустого состояния нет, как у пар и достижений: блок появляется,
 * когда есть что показать, — экзамены, ссылки или сбой. Сбой запроса
 * ссылок не гасит: они приехали с карточкой и от этого запроса не зависят.
 */
export function TeacherExams({ state, graduationPdf, nonGraduationPdf }: TeacherExamsProps) {
  const { days, today, isOffline, isError, errorMessage, refetch } = state;
  const hasFiles = graduationPdf !== null || nonGraduationPdf !== null;

  if (days.length === 0 && !hasFiles && !isOffline && !isError) return null;

  return (
    <section className="flex flex-col gap-4 rounded bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-h5 text-text-heading">Расписание экзаменов</h2>

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
          title="Не удалось загрузить экзамены"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {days.length > 0 && (
        <div className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2">
          {days.map((day) => (
            <ExamDayCard key={day.day} day={day} isToday={day.day === today} />
          ))}
        </div>
      )}

      {hasFiles && (
        <ul className="flex flex-col gap-3">
          <ExamScheduleLink label="Выпускные курсы (PDF)" href={graduationPdf} />
          <ExamScheduleLink label="Невыпускные курсы (PDF)" href={nonGraduationPdf} />
        </ul>
      )}
    </section>
  );
}

/**
 * Ссылка на PDF с расписанием экзаменов — или ничего. Показывается словом,
 * а не адресом: адреса длинные и разъезжаются на три строки.
 */
function ExamScheduleLink({ label, href }: { label: string; href: string | null }) {
  if (href === null) return null;

  return (
    <li>
      <a
        href={href}
        // Файл лежит на стороннем сайте (`stankin.ru`), и уводить с портала
        // в той же вкладке незачем; `rel` — обязательная пара к `_blank`.
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 text-base text-primary transition-colors hover:underline"
      >
        <FileText size={16} aria-hidden />
        {label}
      </a>
    </li>
  );
}
