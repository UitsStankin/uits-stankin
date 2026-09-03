import { AchievementCard } from '@entities/achievement';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

import type { TeacherAchievementsState } from '../model/useTeacherAchievements';

interface TeacherAchievementsProps {
  state: TeacherAchievementsState;
}

/**
 * Блок достижений на карточке преподавателя. Чистый: получает разобранные
 * состояния, а не запрос, — решает за него `model/useTeacherAchievements`.
 *
 * Заголовок с карточками на фоне страницы, а не внутри белой плашки, как
 * соседние разделы профиля: карточка достижения — сама белая плашка,
 * и вложенная в другую она читалась бы как ошибка вёрстки. Раскладка взята
 * у секций главной (`pages/HomePage/ui/HomeFeed.tsx`) — там ровно тот же
 * случай: заголовок над карточками записей.
 *
 * **Пустого состояния у блока нет: когда достижений нет, нет и блока.**
 * Это то же правило, по которому карточка ППС не показывает незаполненные
 * поля: достижений не будет у большинства преподавателей, и «Достижений
 * пока нет» под каждой второй карточкой — надпись, из которой посетителю
 * ничего не следует. Сбой — другое дело: там данные есть, но не доехали,
 * и промолчать значило бы их потерять.
 */
export function TeacherAchievements({ state }: TeacherAchievementsProps) {
  const { achievements, total, isOffline, isError, errorMessage, refetch, hrefForAchievement } =
    state;

  const hasSomethingToSay = achievements.length > 0 || isOffline || isError;
  if (!hasSomethingToSay) return null;

  return (
    <section className="flex flex-col gap-gutter-sm">
      <h2 className="text-h5 text-text-heading">Достижения преподавателя</h2>

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
          title="Не удалось загрузить достижения"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {achievements.length > 0 && (
        <>
          <ul className="flex flex-col gap-gutter-sm">
            {achievements.map((achievement) => (
              <li key={achievement.id}>
                {/* Имя преподавателя выключено: на его же карточке оно
                    повторялось бы под каждым достижением. */}
                <AchievementCard
                  achievement={achievement}
                  href={hrefForAchievement(achievement.id)}
                  showTeacher={false}
                />
              </li>
            ))}
          </ul>

          {/* Блок берёт одну страницу — двадцать записей по контракту.
              Если их больше, это говорится вслух: молча показанные
              «последние двадцать» выглядят полным списком, а отдельного
              адреса «достижения этого преподавателя», куда можно было бы
              увести за остальными, у портала нет. */}
          {total > achievements.length && (
            <p className="text-sm text-text-muted">
              Показаны последние {achievements.length} из {total}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
