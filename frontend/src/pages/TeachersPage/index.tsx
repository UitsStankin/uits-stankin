import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useTeacherList } from './model/useTeacherList';
import { TeacherGrid } from './ui/TeacherGrid';
import { TeacherGridSkeleton } from './ui/TeacherGridSkeleton';

/**
 * Профессорско-преподавательский состав кафедры. Сборка: состояние берётся
 * из модели, разметка — из чистых компонентов.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/teachers` открыта всем.
 *
 * Отдельного блока «заведующий кафедрой» здесь нет, хотя в оригинале он
 * стоял над списком. Там он был **захардкожен в разметке** — имя, фото,
 * телефон и почта прямо в шаблоне, — а в контракте признака заведующего
 * нет вовсе: заведующий приходит обычной карточкой в общем списке.
 * Второй источник правды о живом человеке заводить незачем; понадобится
 * выделять — это поле в карточке, то есть заявка бэкендеру, а не вёрстка.
 */
export default function TeachersPage() {
  const {
    teachers,
    page,
    totalPages,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    hrefForTeacher,
  } = useTeacherList();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Профессорско-преподавательский состав</h1>

      {isLoading && <TeacherGridSkeleton />}

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
          title="Не удалось загрузить список преподавателей"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Преподавателей пока нет"
          description="Карточки сотрудников появятся здесь, как только их заведут."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая сетка без объяснения выглядела бы
          так, будто сотрудники кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {teachers.length > 0 && (
        <>
          <TeacherGrid
            teachers={teachers}
            hrefForTeacher={hrefForTeacher}
            isSwitching={isSwitching}
          />
          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}
    </div>
  );
}
