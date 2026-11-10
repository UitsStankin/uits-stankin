import { Link } from 'react-router';
import { Plus } from 'lucide-react';

import { adminTeacherRoute } from '@shared/config/routes';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { type ArchiveView, useTeachersAdmin } from './model/useTeachersAdmin';
import { ArchiveFilter } from './ui/ArchiveFilter';
import { teacherColumns } from './ui/teacherColumns';

/**
 * Пустой список — про то, что отобрано, а не про раздел вообще:
 * `totalElements` контракт считает с учётом отбора, и «карточек пока нет»
 * на пустом архиве было бы неправдой.
 */
const EMPTY_TEXT: Record<ArchiveView, { title: string; description: string }> = {
  active: {
    title: 'Действующих карточек нет',
    description:
      'Заведите новую карточку или верните преподавателя из архива — она появится в разделе «Преподаватели» на сайте.',
  },
  archived: {
    title: 'В архиве пусто',
    description:
      'Сюда попадают карточки ушедших преподавателей: на сайте их нет в списках, но по прямой ссылке они открываются.',
  },
  all: {
    title: 'Карточек преподавателей пока нет',
    description: 'Заведите первую — она появится в разделе «Преподаватели» на сайте.',
  },
};

/**
 * Карточки ППС в админке: список с отбором по архиву, архив, удаление
 * и дорога к форме.
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
    view,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    hrefForView,
    onSortingChange,
    deleting,
    askDelete,
    cancelDelete,
    confirmDelete,
    archiveInsteadOfDelete,
    isDeleting,
    archive,
    unarchive,
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

      <ArchiveFilter current={view} hrefForView={hrefForView} />

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
        <StatusBlock title={EMPTY_TEXT[view].title} description={EMPTY_TEXT[view].description} />
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
            columns={teacherColumns({
              onDelete: askDelete,
              onArchive: archive,
              onUnarchive: unarchive,
            })}
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
        Текст подтверждения перечисляет последствия поимённо — по таблице
        «Что уносит с собой удаление карточки» в docs/API.md (заявка B-8,
        закрыта T-82). Источник — контракт, а не changeset'ы бэкенда:
        поменяется поведение — поменяется таблица, и сверять текст надо
        с ней (F-51).

        Невосстановимо из перечисленного только расписание: ручек правки
        у него нет, лишь повторный импорт PDF. Остальное теряет одну ссылку
        на преподавателя. Поэтому окно и предлагает архив: для ушедшего
        преподавателя это штатный путь, а удаление — для ошибочно
        заведённой карточки (docs/API.md, «Архив»). Уже архивной карточке
        предлагать архив незачем.
      */}
      {deleting && (
        <ConfirmDialog
          title="Удалить карточку преподавателя?"
          description={`Карточка «${deleting.lastName} ${deleting.firstName}» и её фотография исчезнут с сайта вместе с расписанием занятий и экзаменов — вернуть расписание можно только повторным импортом. Достижения, записи аспирантуры и ведомости останутся, но потеряют преподавателя. Учётная запись, если она была привязана, продолжит работать.${deleting.archived ? '' : ' Если преподаватель ушёл с кафедры, отправьте карточку в архив: она пропадёт из списков на сайте, а всё связанное с ней сохранится.'}`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
          alternative={
            deleting.archived ? undefined : { label: 'В архив', onClick: archiveInsteadOfDelete }
          }
        />
      )}
    </div>
  );
}
