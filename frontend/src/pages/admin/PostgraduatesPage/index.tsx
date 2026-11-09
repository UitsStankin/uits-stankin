import { Plus } from 'lucide-react';
import { Link } from 'react-router';

import { adminPostgraduateRoute } from '@shared/config/routes';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import { SearchField } from '@shared/ui/SearchField';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { usePostgraduatesAdmin } from './model/usePostgraduatesAdmin';
import { postgraduateColumns } from './ui/postgraduateColumns';

/**
 * Аспирантура в админке: список с поиском, форма на своём адресе,
 * удаление с подтверждением.
 *
 * Устроен как раздел ППС, а не УВП: форме нужен свой запрос за записью
 * (разбор у `adminPostgraduateRoute`). Состояния списка — те же шесть,
 * что у остальных разделов, плюс пустая выдача поиска.
 */
export default function PostgraduatesPage() {
  const model = usePostgraduatesAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h4 text-text-heading">Аспирантура</h1>

        {/* Ссылка, а не кнопка: заведение новой записи — это переход
            на свой адрес, и открыть его в новой вкладке должно быть можно. */}
        <Link
          to={adminPostgraduateRoute('new')}
          className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4" />
          Добавить
        </Link>
      </div>

      <SearchField
        id="admin-postgraduate-search"
        label="Поиск записей аспирантуры"
        placeholder="Фамилия, тема, специальность, год, руководитель"
        value={model.searchText}
        onChange={model.onSearchChange}
        onClear={model.onSearchClear}
        foundText={model.foundCount === null ? null : `Найдено записей: ${model.foundCount}`}
      />

      {model.isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={model.refetch} />}
        />
      )}

      {model.isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить записи аспирантуры"
          description={model.errorMessage}
          action={<RetryButton onClick={model.refetch} />}
        />
      )}

      {model.isEmpty &&
        (model.isSearching ? (
          <StatusBlock
            title="Ничего не нашлось"
            description="Под этот поиск не попала ни одна запись."
            action={<ActionLink to={model.resetSearchHref}>Показать все</ActionLink>}
          />
        ) : (
          <StatusBlock
            title="Записей пока нет"
            description="Заведите первую — она появится в таблице аспирантов на сайте."
          />
        ))}

      {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
          `200` с пустым `content`. */}
      {model.isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${model.totalPages}.`}
          action={<ActionLink to={model.hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(model.isLoading || model.postgraduates.length > 0) && (
        <>
          <DataTable
            columns={postgraduateColumns({ onDelete: model.askDelete })}
            data={model.postgraduates}
            getRowId={(postgraduate) => String(postgraduate.id)}
            label="Записи аспирантуры"
            isLoading={model.isLoading}
            isSwitching={model.isSwitching}
          />

          <Pagination page={model.page} totalPages={model.totalPages} buildHref={model.hrefForPage} />
        </>
      )}

      {model.deleting && (
        <ConfirmDialog
          title="Удалить запись аспирантуры?"
          description={`Запись «${model.deleting.studentName}» исчезнет из таблицы на сайте вместе с данными аспиранта. Отменить это будет нельзя.`}
          confirmLabel="Удалить"
          onConfirm={model.confirmDelete}
          onCancel={model.cancelDelete}
          isPending={model.isDeleting}
        />
      )}
    </div>
  );
}
