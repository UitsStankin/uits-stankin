import { degreeLabel, rankLabel } from '@shared/config/teacherDictionaries';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { cn } from '@shared/lib';
import type { Teacher } from '@shared/types';
import { teacherFullName } from '@entities/teacher';

import { formatYears } from '../lib/teacherFields';
import { DefinitionField, definitionLabelClass } from './DefinitionField';

interface TeacherCardProps {
  card: Teacher;
  /** Показать форму вместо карточки. */
  onEdit: () => void;
}

/**
 * Карточка преподавателя в личном кабинете — режим чтения. Чистая:
 * данные и обработчик приходят пропсами из сборки страницы.
 *
 * Заголовок и подпись повторяют старый портал. Состав полей — полная
 * карточка контракта T-26: то же, что увидит посетитель на публичной
 * странице ППС (F-21), поэтому карточка честно показывает всё,
 * что правит форма, плюс дисциплины, которые правит модератор.
 */
export function TeacherCard({ card, onEdit }: TeacherCardProps) {
  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <header className="border-b border-default pb-4">
        <h2 className="text-h5 text-text-heading">Информация о преподавателе</h2>
        <p className="mt-1 text-sm text-text-muted">
          Здесь находится информация о преподавателе, связанном с вашим аккаунтом
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row">
        <img
          src={card.avatarUrl ?? DEFAULT_AVATAR_URL}
          alt=""
          // Фото декоративное: всё, что оно могло бы сообщить, стоит рядом
          // текстом — диктору его читать незачем.
          aria-hidden
          className="h-28 w-28 shrink-0 self-center rounded-full object-cover sm:self-start"
        />

        <dl className="flex min-w-0 flex-1 flex-col gap-4">
          <DefinitionField label="ФИО" value={teacherFullName(card)} />
          <DefinitionField label="Должность" value={card.position} />
          <DefinitionField label="Учёная степень" value={degreeLabel(card.degree)} />
          <DefinitionField label="Учёное звание" value={rankLabel(card.rank)} />
          <DefinitionField label="Общий стаж" value={formatYears(card.experience)} />
          <DefinitionField label="Стаж по специальности" value={formatYears(card.professionalExperience)} />
          <DefinitionField label="Телефон" value={card.phoneNumber} />
          <DefinitionField label="Электронная почта" value={card.email} />
          <DefinitionField label="Мессенджер" value={card.messenger} />
          <DefinitionField label="Образование" value={card.education} />
          <DefinitionField label="Повышение квалификации" value={card.qualification} />
          <DefinitionField label="Биография" value={card.bio} />

          <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
            <dt className={definitionLabelClass}>Дисциплины</dt>
            {card.subjects.length > 0 ? (
              <dd className="flex flex-wrap gap-1.5">
                {card.subjects.map((subject) => (
                  <span
                    key={subject.id}
                    className="rounded-pill bg-secondary px-2.5 py-0.5 text-sm font-bold text-text-heading"
                  >
                    {subject.name}
                  </span>
                ))}
              </dd>
            ) : (
              <dd className="text-base text-text-muted">—</dd>
            )}
          </div>

          <ExamScheduleField label="Экзамены: выпускные курсы" href={card.examScheduleGraduation} />
          <ExamScheduleField
            label="Экзамены: невыпускные курсы"
            href={card.examScheduleNonGraduation}
          />
        </dl>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'rounded bg-primary px-4 py-2.5 text-base font-bold text-white transition',
            'hover:brightness-95',
          )}
        >
          Редактировать
        </button>
      </div>
    </section>
  );
}

/**
 * Ссылка на PDF с расписанием — или прочерк. Показывается словом,
 * а не адресом: адреса длинные, а в паре «подпись — значение» значение
 * должно читаться, не разъезжаясь на три строки.
 */
function ExamScheduleField({ label, href }: { label: string; href: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className={definitionLabelClass}>{label}</dt>
      {href ? (
        <dd className="min-w-0 break-words text-base">
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary transition-colors hover:underline"
          >
            Открыть PDF
          </a>
        </dd>
      ) : (
        <dd className="text-base text-text-muted">—</dd>
      )}
    </div>
  );
}
