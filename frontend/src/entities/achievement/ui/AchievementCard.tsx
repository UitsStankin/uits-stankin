import { Link } from 'react-router';
import { UserRound } from 'lucide-react';

import { cn, formatDate } from '@shared/lib';
import type { Achievement } from '@shared/types';

interface AchievementCardProps {
  achievement: Achievement;
  /** Адрес детальной страницы. Собирает вызывающий: карточка не знает роутов. */
  href: string;
  /**
   * Показывать ли имя преподавателя. Выключается на его же карточке ППС:
   * в блоке «Достижения преподавателя» одно и то же имя повторялось бы
   * под каждым достижением, ничего не добавляя.
   */
  showTeacher?: boolean;
  className?: string;
}

/**
 * Карточка достижения в списке. Чистая: ни состояния, ни запросов —
 * только запись и адрес. Раскладка общая с `NewsCard` и `ConferenceCard`:
 * обложка слева, текст справа, кликается вся карточка через растянутую
 * ссылку.
 *
 * Обложка рисуется без проверки, в отличие от новости и конференции:
 * у достижения она **обязательна** по контракту — запись без неё
 * не сохраняется (docs/API.md, «Достижения кафедры»). Обязательны там же
 * заголовок и описание, поэтому и они выводятся без ветвлений: пустых
 * карточек у этой сущности не бывает.
 *
 * Имя преподавателя показывается текстом, а не ссылкой на его карточку.
 * Причина техническая и жёсткая: карточка кликается целиком растянутой
 * ссылкой заголовка, и вторая ссылка внутри неё либо перекрывается этой
 * растяжкой, либо, поднятая над ней, пробивает в карточке дыру. Ссылка
 * на преподавателя стоит на детальной странице достижения, где такой
 * растяжки нет.
 */
export function AchievementCard({
  achievement,
  href,
  showTeacher = true,
  className,
}: AchievementCardProps) {
  const date = formatDate(achievement.createdAt);
  const teacher = showTeacher ? achievement.teacherName : null;

  return (
    // relative + растянутая ссылка ниже: кликается вся карточка, но ссылка
    // в разметке одна — обёртка всего в <a> утащила бы в имя ссылки
    // и дату, и описание.
    <article
      className={cn(
        'relative flex flex-col overflow-hidden rounded bg-white shadow-sm transition-shadow',
        'hover:shadow focus-within:shadow sm:flex-row',
        className,
      )}
    >
      <img
        src={achievement.previewImageUrl}
        // Описания обложки у достижения нет вовсе — такого поля нет
        // ни в контракте, ни в старой модели. Картинка декоративна: всё,
        // что она могла бы сообщить, стоит рядом заголовком, и пустой
        // alt честнее выдуманного.
        alt=""
        // Двадцать карточек — двадцать картинок; без lazy они уезжают
        // в сеть все разом и забивают канал ещё до первого экрана.
        loading="lazy"
        className="h-48 w-full shrink-0 object-cover sm:h-auto sm:w-56"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-5">
        {(date !== null || teacher !== null) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
            {/* dateTime — машиночитаемая форма: пользователь видит
                «27 августа 2026 г.», а поисковик и диктор получают
                исходный ISO. */}
            {date && <time dateTime={achievement.createdAt}>{date}</time>}

            {teacher && (
              <span className="flex min-w-0 items-center gap-1.5">
                <UserRound size={16} aria-hidden className="shrink-0" />
                {/* Иконка декоративна, и без подписи диктор прочитал бы
                    голое имя — непонятно, чьё и при чём. */}
                <span className="sr-only">Преподаватель:</span>
                <span className="truncate">{teacher}</span>
              </span>
            )}
          </div>
        )}

        <h3 className="text-h5 text-text-heading">
          <Link
            to={href}
            className="after:absolute after:inset-0 hover:text-primary focus-visible:text-primary"
          >
            {achievement.title}
          </Link>
        </h3>

        {/* Описание обрезается тремя строками, чтобы достижение с длинным
            текстом не растягивало карточку вдвое против соседних. */}
        <p className="line-clamp-3 text-base">{achievement.description}</p>
      </div>
    </article>
  );
}
