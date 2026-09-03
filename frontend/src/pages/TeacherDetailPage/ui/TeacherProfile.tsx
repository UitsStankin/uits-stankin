import type { ReactNode } from 'react';
import { FileText, Mail, MessageCircle, Phone } from 'lucide-react';

import { formatYears, teacherCredentials, teacherFullName } from '@entities/teacher';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import type { Subject, Teacher } from '@shared/types';

interface TeacherProfileProps {
  teacher: Teacher;
}

/**
 * Карточка преподавателя целиком. Чистая: получает карточку и рисует её.
 *
 * ### Разделы, а не вкладки
 *
 * В оригинале страница была разбита на пять вкладок — общая информация,
 * расписание, дисциплины, публикации, достижения. Данные есть у трёх:
 * достижения приехали с F-25, расписание преподавателя — Фаза 2,
 * публикации — Фаза 4. Вкладки, две из которых пусты, хуже разделов
 * подряд: посетитель нажимает и ничего не находит. Разделы к тому же
 * читаются подряд на телефоне и открываются поиском по странице.
 * Расписание встанет сюда же новым блоком.
 *
 * Достижения при этом стоят **не здесь**, а соседним блоком в сборке
 * страницы (`ui/TeacherAchievements.tsx`): у них своя ручка, своё состояние
 * загрузки и свой сбой, а этот компонент обязан оставаться чистым —
 * карточка на входе, разметка на выходе.
 *
 * ### Пустые поля
 *
 * Не показываются вовсе — в отличие от личного кабинета, где на их месте
 * стоит прочерк. Разница не в вёрстке, а в читателе: владелец карточки
 * видит прочерк как «здесь можно заполнить», посетителю портала знать
 * о незаполненном поле незачем, а страница из десяти прочерков выглядит
 * сломанной. Контракт разрешает `null` почти везде: обязательны только
 * фамилия, имя и должность.
 */
export function TeacherProfile({ teacher }: TeacherProfileProps) {
  const fullName = teacherFullName(teacher);
  const experience = formatYears(teacher.experience);
  const professionalExperience = formatYears(teacher.professionalExperience);
  const hasExamSchedule =
    teacher.examScheduleGraduation !== null || teacher.examScheduleNonGraduation !== null;

  return (
    <div className="flex flex-col gap-gutter-sm">
      <header className="flex flex-col items-center gap-6 rounded bg-white p-6 text-center shadow-sm sm:flex-row sm:items-start sm:p-8 sm:text-left">
        <img
          src={teacher.avatarUrl ?? DEFAULT_AVATAR_URL}
          // Фото декоративное: имя стоит рядом заголовком, и «фото
          // Ивановой М. П.» диктор прочитал бы дважды.
          alt=""
          aria-hidden
          className="h-40 w-40 shrink-0 rounded-full object-cover"
        />

        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-h3 text-text-heading">{fullName}</h1>

          <p className="text-lg leading-normal text-text-default">
            {teacherCredentials(teacher)}
          </p>

          {(teacher.email || teacher.phoneNumber || teacher.messenger) && (
            <ul className="mt-2 flex flex-col items-center gap-2 sm:items-start">
              {teacher.email && (
                <ContactItem icon={<Mail size={16} aria-hidden />} label="Электронная почта">
                  {/* Почта и телефон — ссылки: на телефоне это один тап
                      до звонка и до письма, а не выделение текста. */}
                  <a href={`mailto:${teacher.email}`} className="text-primary hover:underline">
                    {teacher.email}
                  </a>
                </ContactItem>
              )}

              {teacher.phoneNumber && (
                <ContactItem icon={<Phone size={16} aria-hidden />} label="Телефон">
                  <a href={`tel:${teacher.phoneNumber}`} className="text-primary hover:underline">
                    {teacher.phoneNumber}
                  </a>
                </ContactItem>
              )}

              {teacher.messenger && (
                // Мессенджер — не ссылка: в поле лежит имя пользователя
                // («@m_ivanova»), а не адрес, и собирать из него ссылку
                // значило бы гадать, какой это мессенджер. В оригинале
                // такая ссылка стояла и вела в никуда.
                <ContactItem icon={<MessageCircle size={16} aria-hidden />} label="Мессенджер">
                  {teacher.messenger}
                </ContactItem>
              )}
            </ul>
          )}
        </div>
      </header>

      {(experience || professionalExperience) && (
        <Section title="Стаж работы">
          <dl className="flex flex-col gap-3">
            {experience && <Fact label="Общий стаж" value={experience} />}
            {professionalExperience && (
              <Fact label="По специальности" value={professionalExperience} />
            )}
          </dl>
        </Section>
      )}

      {teacher.education && (
        <Section title="Образование">
          <RichText html={teacher.education} />
        </Section>
      )}

      {teacher.qualification && (
        <Section title="Повышение квалификации">
          <RichText html={teacher.qualification} />
        </Section>
      )}

      {teacher.bio && (
        <Section title="О преподавателе">
          {/* `bio` — плоский текст, в отличие от двух разделов выше: сервер
              его не чистит, и разметке в нём взяться неоткуда (docs/API.md,
              «Преподаватели»). Выводится текстовым узлом.
              `whitespace-pre-line`: переносы строк модератор ставит руками,
              других средств разбить текст на абзацы у него здесь нет. */}
          <p className="whitespace-pre-line text-base leading-normal">{teacher.bio}</p>
        </Section>
      )}

      {teacher.subjects.length > 0 && (
        <Section title="Читаемые дисциплины">
          <ul className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2">
            {teacher.subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </ul>
        </Section>
      )}

      {hasExamSchedule && (
        <Section title="Расписание экзаменов">
          <ul className="flex flex-col gap-3">
            <ExamScheduleLink label="Выпускные курсы" href={teacher.examScheduleGraduation} />
            <ExamScheduleLink
              label="Невыпускные курсы"
              href={teacher.examScheduleNonGraduation}
            />
          </ul>
        </Section>
      )}
    </div>
  );
}

/** Раздел карточки: белая плашка с заголовком. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-h5 text-text-heading">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Пара «подпись — значение» в разделе стажа. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm text-text-muted sm:w-44">{label}</dt>
      <dd className="text-base text-text-heading">{value}</dd>
    </div>
  );
}

/** Строка контакта: иконка, подпись для диктора, значение. */
function ContactItem({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2 text-base">
      <span className="text-text-muted">{icon}</span>
      {/* Иконка декоративна, и без подписи диктор прочитал бы голый номер.
          Подпись только для него: рядом с иконкой она заняла бы половину
          строки, ничего не добавив зрячему. */}
      <span className="sr-only">{label}:</span>
      {children}
    </li>
  );
}

/**
 * `education` и `qualification` — rich-text HTML: на старом портале оба поля
 * выводились через `[innerHTML]`, и в перенесённых строках лежит разметка.
 *
 * Про `dangerouslySetInnerHTML` здесь верно ровно то же, что записано
 * в `pages/NewsDetailPage/ui/NewsArticle.tsx`, и по той же причине: границей,
 * на которой отсекается чужой исполняемый код, выбран бэкенд. `TeacherService`
 * чистит оба поля через общий `HtmlSanitizer` на всех трёх путях записи —
 * `POST`, `PUT` и `PUT /api/teachers/me` (docs/API.md, «Создание и правка
 * карточек»), а вычищенное до пустоты сохраняется как `null`, поэтому пустой
 * строки здесь не бывает.
 *
 * Второй санитайзер на клиенте не ставится — он стал бы вторым источником
 * правды о допустимых тегах. Условие, при котором решение перестаёт быть
 * верным, то же: перенос старой базы мимо сервиса (ARCHITECTURE §7).
 */
function RichText({ html }: { html: string }) {
  return (
    // prose из @tailwindcss/typography: у пришедшего HTML своих классов нет,
    // а сброс Tailwind снимает стили с ul и p — без него список образования
    // выглядит одним абзацем. max-w-none: ширину держит плашка.
    <div
      className="prose prose-sm max-w-none prose-headings:text-text-heading prose-a:text-primary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Дисциплина: название и описание, если оно заполнено. */
function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <li className="rounded bg-light p-4">
      <h3 className="text-base font-bold text-text-heading">{subject.name}</h3>
      {subject.description && <p className="mt-1 text-base">{subject.description}</p>}
    </li>
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
