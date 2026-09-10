import { Plus } from 'lucide-react';

import { NewsDialog } from '@features/manage-news';
import type { PostType } from '@shared/types';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useNewsAdmin } from './model/useNewsAdmin';
import { PostTypeFilter } from './ui/PostTypeFilter';
import { newsColumns } from './ui/newsColumns';

/**
 * Пустой список — про то, что отобрано, а не про раздел вообще.
 * `totalElements` контракт считает **с учётом фильтра**, поэтому «записей
 * пока нет» на выбранных объявлениях было бы неправдой: новостей рядом
 * может быть три десятка.
 */
const EMPTY_TITLE: Record<PostType | 'all', string> = {
  all: 'Записей пока нет',
  news: 'Новостей пока нет',
  announcements: 'Объявлений пока нет',
};

/**
 * Новости и объявления: второй настоящий экран админки и первый с формой,
 * в которой есть всё сразу — rich-text, картинки и состояние публикации.
 *
 * Раздел один на два типа записей, потому что в базе они одна сущность
 * и приходят одной ручкой; разделяет их фильтр в адресе. Двумя разделами
 * меню это было бы двумя копиями одного экрана, различающимися строкой
 * запроса.
 *
 * Состояния списка — те же шесть, что у публичных разделов и у дисциплин,
 * и считаются так же (`model/useNewsAdmin.ts`).
 */
export default function AdminNewsPage() {
  const {
    news,
    page,
    totalPages,
    sorting,
    postType,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isOutOfRange,
    hrefForPage,
    hrefForType,
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
  } = useNewsAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Новости и объявления</h1>

        <button
          type="button"
          onClick={startCreate}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Добавить
        </button>
      </div>

      <PostTypeFilter current={postType} hrefForType={hrefForType} />

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
          title="Не удалось загрузить записи"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title={EMPTY_TITLE[postType ?? 'all']}
          description="Добавьте первую — она появится на сайте, если оставить её опубликованной."
        />
      )}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. Пустая таблица без объяснения выглядела бы
          так, будто записи кончились совсем. */}
      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || news.length > 0) && (
        <>
          <DataTable
            columns={newsColumns({ onEdit: startEdit, onDelete: askDelete })}
            data={news}
            getRowId={(item) => String(item.id)}
            label="Новости и объявления"
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
        монтировании, поэтому «правим другую запись» и «форма показывает
        её поля» — одно и то же событие.
      */}
      {editing && <NewsDialog news={editing.news} onClose={closeEditor} />}

      {deleting && (
        <ConfirmDialog
          title="Удалить запись?"
          description={`Запись «${deleting.title}» будет удалена вместе с обложкой, и восстановить её нечем. Чтобы просто убрать её с сайта, снимите в форме флажок «Опубликовать».`}
          confirmLabel="Удалить"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
