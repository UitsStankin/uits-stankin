import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import { TEACHERS_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useTeacherAchievements } from './model/useTeacherAchievements';
import { useTeacherCard } from './model/useTeacherCard';
import { useTeacherExams } from './model/useTeacherExams';
import { TeacherPublicationsSection } from './TeacherPublicationsSection';
import { useTeacherSchedule } from './model/useTeacherSchedule';
import { TeacherAchievements } from './ui/TeacherAchievements';
import { TeacherExams } from './ui/TeacherExams';
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
 * Расписание пар, экзамены и достижения загружаются вместе с карточкой.
 * Запрос публикаций начинается после её загрузки: фильтру нужно полное
 * имя преподавателя. Адрес прежней вкладки открывает только публикации.
 */
export default function TeacherDetailPage({ publicationsOnly = false }: { publicationsOnly?: boolean }) {
  const { teacher, id, isLoading, isOffline, isNotFound, isError, errorMessage, refetch } =
    useTeacherCard();
  const schedule = useTeacherSchedule(publicationsOnly ? null : id);
  const exams = useTeacherExams(publicationsOnly ? null : id);
  const achievements = useTeacherAchievements(publicationsOnly ? null : id);

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

      {teacher && !publicationsOnly && (
        <>
          <TeacherProfile teacher={teacher} />
          <TeacherSchedule state={schedule} />
          <TeacherExams
            state={exams}
            graduationPdf={teacher.examScheduleGraduation}
            nonGraduationPdf={teacher.examScheduleNonGraduation}
          />
          <TeacherAchievements state={achievements} />
        </>
      )}
      {teacher && <TeacherPublicationsSection teacher={teacher} standalone={publicationsOnly} />}
    </div>
  );
}
