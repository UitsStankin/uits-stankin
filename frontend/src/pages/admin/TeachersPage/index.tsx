import { Link } from 'react-router';
import { Plus } from 'lucide-react';

import { adminTeacherRoute } from '@shared/config/routes';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useTeachersAdmin } from './model/useTeachersAdmin';
import { teacherColumns } from './ui/teacherColumns';

/**
 * Карточки ППС в админке: список, удаление и дорога к форме.
 *
 * От разделов новостей и дисциплин отличается одним: формы правки
 * здесь нет. Она живёт своей страницей, потому что списочная ручка
 * отдаёт **короткую** карточку — без контактов, стажей, дисциплин, ключа
 * фото и связи с учётной записью, — и форме всё равно нужен свой запрос.
 * Разбор в `shared/config/routes.ts`, у `adminTeacherRoute`.
 *
 * Состояния списка — те же шесть, что у публичных разделов, и считаются
 * так же (`model/useTeachersAdmin.ts`).
 */
export default function TeachersPage() {
  const {
    teachers,
    page,
    totalPages,
    sorting,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    onSortingChange,
    deleting,
    askDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
  } = useTeachersAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Преподаватели</h1>

        {/* Ссылка, а не кнопка: заведение новой карточки — это переход
            на свой адрес, и открыть его в новой вкладке должно быть можно. */}
        <Link
          to={adminTeacherRoute('new')}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Добавить
        </Link>
      </div>

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
          title="Не удалось загрузить преподавателей"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Карточек преподавателей пока нет"
          description="Заведите первую — она появится в разделе «Преподаватели» на сайте."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая таблица без объяснения выглядела бы
          так, будто карточки кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || teachers.length > 0) && (
        <>
          <DataTable
            columns={teacherColumns({ onDelete: askDelete })}
            data={teachers}
            getRowId={(teacher) => String(teacher.id)}
            label="Преподаватели"
            isLoading={isLoading}
            isSwitching={isSwitching}
            sorting={sorting}
            onSortingChange={onSortingChange}
          />

          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}

      {/*
        Текст подтверждения перечисляет последствия поимённо, и это
        не многословие: удаление карточки ППС тянет за собой пять таблиц,
        и ведут они себя по-разному. Расписание занятий и экзаменов уходит
        каскадом (`fk_schedule_teacher`, `fk_exam_schedule_teacher`,
        `onDelete: CASCADE`), а достижения, ведомости и аспиранты остаются
        с обнулённой связью (`onDelete: SET NULL`) — то есть достижение
        становится кафедральным, а у аспиранта пропадает руководитель.
        Модератор, убирающий уволившегося, должен знать про второе:
        «исчезнет карточка» звучит безобиднее, чем есть на самом деле.

        В контракте этого нет — docs/API.md говорит только про учётную
        запись, — и выяснено чтением changeset'ов. Заявка B-8 просит
        записать последствия в контракт: они принадлежат бэкенду
        и могут измениться, а обещание здесь останется прежним.
      */}
      {deleting && (
        <ConfirmDialog
          title="Удалить карточку преподавателя?"
          description={`Карточка «${deleting.lastName} ${deleting.firstName}» и её фотография исчезнут с сайта вместе с расписанием занятий и экзаменов. Достижения и аспиранты останутся, но потеряют преподавателя: достижения станут кафедральными, аспиранты — без руководителя. Учётная запись, если она была привязана, продолжит работать.`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
