import { Link } from 'react-router';
import { UserRound } from 'lucide-react';

import { teacherRoute } from '@shared/config/routes';
import { formatDate } from '@shared/lib';
import type { Achievement } from '@shared/types';

interface AchievementArticleProps {
  achievement: Achievement;
}

/**
 * Достижение целиком. Чистое: получает запись и рисует её.
 *
 * Раскладка — как у `NewsArticle`: шапка, обложка, текст. Ветвлений
 * по пустоте здесь нет, в отличие от объявления о конференции: у достижения
 * необязательна одна лишь привязка к преподавателю, остальное контракт
 * обещает заполненным (docs/API.md, «Достижения кафедры»).
 *
 * Имя преподавателя ведёт на его карточку — в отличие от карточки в списке,
 * где вторая ссылка не уживается с растянутой ссылкой заголовка. Пара
 * `teacherId` / `teacherName` приходит целиком либо не приходит вовсе,
 * но тип этого не обещает: имя без ссылки рисуется текстом, а не роняет
 * страницу.
 *
 * Про `dangerouslySetInnerHTML` у `content` верно ровно то, что записано
 * в `pages/NewsDetailPage/ui/NewsArticle.tsx`, и по той же причине: граница,
 * на которой отсекается чужой исполняемый код, — бэкенд. `AchievementService`
 * прогоняет `content` через общий `HtmlSanitizer` на создании и правке
 * (T-29), причём вычищенное до пустоты не сохраняется вовсе — это `400`.
 * Второй санитайзер на клиенте не ставится — он стал бы вторым источником
 * правды о допустимых тегах; условие пересмотра то же: перенос старой базы
 * мимо сервиса (ARCHITECTURE §7).
 */
export function AchievementArticle({ achievement }: AchievementArticleProps) {
  const date = formatDate(achievement.createdAt);

  return (
    <article className="rounded bg-white p-6 shadow-sm md:p-8">
      <header className="flex flex-col gap-3 border-b border-default pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          {/* dateTime — машиночитаемая форма: пользователь видит «27 августа
              2026 г.», а поисковик и диктор получают исходный ISO. */}
          {date && <time dateTime={achievement.createdAt}>{date}</time>}

          {achievement.teacherName && (
            <span className="flex min-w-0 items-center gap-1.5">
              <UserRound size={16} aria-hidden className="shrink-0" />
              {/* Иконка декоративна, и без подписи диктор прочитал бы голое
                  имя — непонятно, чьё и при чём. */}
              <span className="sr-only">Преподаватель:</span>
              {achievement.teacherId === null ? (
                <span className="truncate">{achievement.teacherName}</span>
              ) : (
                <Link
                  to={teacherRoute(achievement.teacherId)}
                  className="truncate text-primary hover:underline"
                >
                  {achievement.teacherName}
                </Link>
              )}
            </span>
          )}
        </div>

        <h1 className="text-h3 text-text-heading">{achievement.title}</h1>

        <p className="text-lg leading-normal text-text-default">{achievement.description}</p>
      </header>

      <img
        src={achievement.previewImageUrl}
        // Описания обложки у достижения нет вовсе — такого поля нет
        // ни в контракте, ни в старой модели. Картинка декоративна:
        // всё, что она могла бы сообщить, стоит выше заголовком.
        alt=""
        // Высота ограничена по правилу из NewsArticle: квадратный диплом
        // на всю ширину карточки начинал бы статью с прокрутки.
        className="mt-6 max-h-[26rem] w-full rounded object-cover"
      />

      {/* prose из @tailwindcss/typography: у пришедшего HTML своих классов
          нет, а сброс Tailwind снимает стили с h2, ul и blockquote. */}
      <div
        className="prose prose-sm mt-6 max-w-none prose-headings:text-text-heading prose-a:text-primary prose-img:rounded"
        dangerouslySetInnerHTML={{ __html: achievement.content }}
      />
    </article>
  );
}
