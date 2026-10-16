import { Plus } from 'lucide-react';

import { SubjectDialog } from '@features/manage-subjects';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useSubjectsAdmin } from './model/useSubjectsAdmin';
import { subjectColumns } from './ui/subjectColumns';

/**
 * Дисциплины: словарь, из которого собираются карточки ППС.
 *
 * Первый настоящий экран админки и проверка её каркаса: список
 * с серверной сортировкой и пагинацией, форма в выезжающей панели,
 * удаление с подтверждением и тосты на исход каждой операции. Всё это
 * общее (`shared/ui`), своего у раздела — только колонки и подписи.
 *
 * Словарь выбран первым не случайно: у него два поля и никакой вёрстки,
 * поэтому в нём видно каркас, а не разметку. Заодно он нужен F-44 —
 * форма карточки ППС выбирает дисциплины из него, а завести их до сих
 * пор было можно только запросом руками.
 *
 * Состояния списка — те же шесть, что у публичных разделов, и считаются
 * так же (`model/useSubjectsAdmin.ts`).
 */
export default function SubjectsPage() {
  const {
    subjects,
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
    editing,
    startCreate,
    startEdit,
    closeEditor,
    deleting,
    askDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
  } = useSubjectsAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Дисциплины</h1>

        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Добавить
        </button>
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
          title="Не удалось загрузить дисциплины"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Дисциплин пока нет"
          description="Добавьте первую — она появится в форме карточки преподавателя."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая таблица без объяснения выглядела бы
          так, будто дисциплины кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || subjects.length > 0) && (
        <>
          <DataTable
            columns={subjectColumns({ onEdit: startEdit, onDelete: askDelete })}
            data={subjects}
            getRowId={(subject) => String(subject.id)}
            label="Дисциплины"
            isLoading={isLoading}
            isSwitching={isSwitching}
            sorting={sorting}
            onSortingChange={onSortingChange}
          />

          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}

      {/*
        Окна монтируются только на время работы с записью — и это
        не экономия рендера: начальные значения формы берутся при
        монтировании, поэтому «правим другую дисциплину» и «форма
        показывает её поля» — одно и то же событие.
      */}
      {editing && <SubjectDialog subject={editing.subject} onClose={closeEditor} />}

      {deleting && (
        <ConfirmDialog
          title="Удалить дисциплину?"
          description={`Дисциплина «${deleting.name}» будет удалена. Если она назначена преподавателям, сервер откажет — сначала снимите её с карточек.`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
