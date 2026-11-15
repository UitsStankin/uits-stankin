import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import { TEACHERS_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useTeacherAchievements } from './model/useTeacherAchievements';
import { useTeacherCard } from './model/useTeacherCard';
import { useTeacherSchedule } from './model/useTeacherSchedule';
import { TeacherAchievements } from './ui/TeacherAchievements';
import { TeacherProfile } from './ui/TeacherProfile';
import { TeacherProfileSkeleton } from './ui/TeacherProfileSkeleton';
import { TeacherSchedule } from './ui/TeacherSchedule';

/**
 * Карточка одного преподавателя. Сборка: состояние из модели, разметка
 * из чистых компонентов.
 *
 * Ссылка «ко всем» ведёт на первую страницу списка, а не «назад» по истории:
 * на страницу попадают и из поиска, и по присланному адресу, и
 * `history.back()` увёл бы такого посетителя с портала совсем.
 *
 * Под профилем — два блока со своими ручками: расписание пар (F-55)
 * и достижения (F-25). Расписание выше: за ним на карточку приходят
 * чаще — студент ищет, где и когда пара.
 *
 * Все три запроса уходят параллельно, но блоки рисуются только рядом
 * с загруженной карточкой: на несуществующем преподавателе ручка
 * достижений отвечает не `404`, а пустой страницей, и «достижений нет»
 * висело бы под «преподаватель не найден».
 */
export default function TeacherDetailPage() {
  const { teacher, id, isLoading, isOffline, isNotFound, isError, errorMessage, refetch } =
    useTeacherCard();
  const schedule = useTeacherSchedule(id);
  const achievements = useTeacherAchievements(id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter-sm">
      <Link
        to={TEACHERS_ROUTE}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />
        Ко всем преподавателям
      </Link>

      {isLoading && <TeacherProfileSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isNotFound && (
        <StatusBlock
          title="Преподаватель не найден"
          // Карточки ППС не скрываются, в отличие от новостей: `404` здесь
          // значит ровно одно — такой карточки нет.
          description="Возможно, карточку удалили, а ссылка на неё осталась."
          action={<ActionLink to={TEACHERS_ROUTE}>К списку преподавателей</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить карточку преподавателя"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {teacher && (
        <>
          <TeacherProfile teacher={teacher} />
          <TeacherSchedule state={schedule} />
          <TeacherAchievements state={achievements} />
        </>
      )}
    </div>
  );
}
