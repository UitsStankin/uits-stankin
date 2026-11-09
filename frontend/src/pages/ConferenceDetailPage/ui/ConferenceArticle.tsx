import type { ReactNode } from 'react';

import { conferenceDatesLabel } from '@entities/conference';
import { formatDate } from '@shared/lib';
import type { Conference } from '@shared/types';

interface ConferenceArticleProps {
  conference: Conference;
}

/**
 * Объявление целиком. Чистое: получает запись и рисует её.
 *
 * Раскладка — как у `NewsArticle`, плюс блок фактов между шапкой
 * и обложкой: даты проведения, время, организатор и контакты. В оригинале
 * этот блок стоял подвалом под текстом; здесь он поднят наверх — посетитель
 * открывает объявление ради дат и контактов, а не листает до них мимо
 * всего текста.
 *
 * Обязателен у объявления только `title`: каждый блок рисуется, лишь когда
 * ему есть что показать, и объявление из одного заголовка — это заголовок,
 * а не лесенка пустых подписей (правило публичных страниц, записанное
 * у `TeacherProfile`).
 *
 * Про `dangerouslySetInnerHTML` у `content` верно ровно то, что записано
 * в `pages/NewsDetailPage/ui/NewsArticle.tsx`, и по той же причине: граница,
 * на которой отсекается чужой исполняемый код, — бэкенд. `ConferenceService`
 * прогоняет `content` через общий `HtmlSanitizer` на создании и правке
 * (T-28), а вычищенное до пустоты сохраняется как `null` — поэтому пустой
 * строки здесь не бывает, а `null` просто не рисует блок. Второй санитайзер
 * на клиенте не ставится — он стал бы вторым источником правды о допустимых
 * тегах; условие пересмотра то же: перенос старой базы мимо сервиса
 * (ARCHITECTURE §7).
 */
export function ConferenceArticle({ conference }: ConferenceArticleProps) {
  const posted = formatDate(conference.createdAt);
  const dates = conferenceDatesLabel(conference.startDate, conference.endDate);

  const hasFacts =
    dates !== null ||
    conference.time !== null ||
    conference.organizer !== null ||
    conference.contactEmail !== null ||
    conference.contactPhone !== null;

  return (
    <article className="rounded bg-white p-6 shadow-sm md:p-8">
      <header className="flex flex-col gap-3 border-b border-default pb-5">
        {posted && (
          <p className="text-sm text-text-muted">
            {/* Дата подписана, а не голая, как у новости: ниже стоят даты
                проведения, и неподписанная дата публикации читалась бы
                как одна из них. dateTime — машиночитаемая форма для
                поисковика и диктора. */}
            Размещено <time dateTime={conference.createdAt}>{posted}</time>
          </p>
        )}

        <h1 className="text-h3 text-text-heading">{conference.title}</h1>

        {conference.description && (
          <p className="text-lg leading-normal text-text-default">{conference.description}</p>
        )}
      </header>

      {hasFacts && (
        <dl className="mt-6 flex flex-col gap-3 rounded bg-light p-5">
          {dates && <Fact label="Даты проведения">{dates}</Fact>}

          {/* `time` — строка `HH:mm` из контракта, всегда без секунд:
              показывается как есть, разбирать в ней нечего. */}
          {conference.time && <Fact label="Время начала">{conference.time}</Fact>}

          {conference.organizer && <Fact label="Организатор">{conference.organizer}</Fact>}

          {conference.contactEmail && (
            <Fact label="Электронная почта">
              {/* Почта и телефон — ссылки: на телефоне это один тап
                  до письма и до звонка, а не выделение текста. */}
              <a
                href={`mailto:${conference.contactEmail}`}
                className="text-primary hover:underline"
              >
                {conference.contactEmail}
              </a>
            </Fact>
          )}

          {conference.contactPhone && (
            <Fact label="Телефон">
              <a href={`tel:${conference.contactPhone}`} className="text-primary hover:underline">
                {conference.contactPhone}
              </a>
            </Fact>
          )}
        </dl>
      )}

      {conference.previewImageUrl && (
        <img
          src={conference.previewImageUrl}
          alt={conference.previewImageDescription ?? ''}
          // Высота ограничена по правилу из NewsArticle: квадратная афиша
          // на всю ширину карточки начинала бы статью с прокрутки.
          className="mt-6 max-h-[26rem] w-full rounded object-cover"
        />
      )}

      {conference.content && (
        // prose из @tailwindcss/typography: у пришедшего HTML своих классов
        // нет, а сброс Tailwind снимает стили с h2, ul и blockquote.
        <div
          className="prose prose-sm mt-6 max-w-none prose-headings:text-text-heading prose-a:text-primary prose-img:rounded"
          dangerouslySetInnerHTML={{ __html: conference.content }}
        />
      )}
    </article>
  );
}

/** Пара «подпись — значение» в блоке фактов. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-sm text-text-muted sm:w-44">{label}</dt>
      <dd className="text-base text-text-heading">{children}</dd>
    </div>
  );
}
