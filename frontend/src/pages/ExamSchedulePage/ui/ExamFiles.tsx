import { FileText } from 'lucide-react';

import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

import type { ExamFileLink, ExamScheduleState } from '../model/useExamSchedule';

interface ExamFilesProps {
  files: ExamScheduleState['files'];
}

/**
 * Расписания экзаменов в PDF из карточек преподавателей — то, чем
 * страница была в оригинале. Чистый.
 *
 * **Ссылки, а не `iframe`, как в оригинале.** Окно высотой 200 пикселей
 * показывало верх первой страницы PDF, и читать его всё равно приходилось,
 * открыв файл; к тому же файлы лежат на `stankin.ru`, и встраивание
 * чужого PDF зависит от заголовков чужого сервера. Порядок списков —
 * оригинала: сначала невыпускные курсы.
 *
 * Нет ни одной ссылки — раздела нет вовсе. Скелета нет: раздел под
 * основным расписанием, и силуэт внизу страницы, мигнувший и исчезнувший,
 * — дёрганье на пустом месте.
 */
export function ExamFiles({ files }: ExamFilesProps) {
  const { nonGraduation, graduation, isError, errorMessage, refetch } = files;

  if (!isError && nonGraduation.length === 0 && graduation.length === 0) return null;

  return (
    <section className="flex flex-col gap-gutter-sm">
      <h2 className="text-h5 text-text-heading">Расписания в PDF</h2>

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить ссылки на PDF"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      <FileList title="Невыпускные курсы" links={nonGraduation} />
      <FileList title="Выпускные курсы" links={graduation} />
    </section>
  );
}

function FileList({ title, links }: { title: string; links: readonly ExamFileLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="rounded bg-white p-6 shadow-sm md:p-8">
      <h3 className="text-base font-bold text-text-heading">{title}</h3>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.teacherId}>
            <a
              href={link.href}
              // Файл лежит на стороннем сайте, и уводить с портала в той же
              // вкладке незачем; `rel` — обязательная пара к `_blank`.
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-base text-primary transition-colors hover:underline"
            >
              <FileText size={16} aria-hidden className="shrink-0" />
              {link.teacherName}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
