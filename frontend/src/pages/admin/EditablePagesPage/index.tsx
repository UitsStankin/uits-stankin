import DataTable from '@shared/ui/DataTable';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useEditablePagesAdmin } from './model/useEditablePagesAdmin';
import { editablePageColumns } from './ui/editablePageColumns';

/**
 * Редактируемые разделы сайта в админке: список тринадцати разделов и вход
 * в правку каждого.
 *
 * Кнопки «Добавить» и удаления нет: набор закрыт на стороне бэкенда —
 * разделы заводит миграция, и слаг каждого захардкожен в маршрутах сайта
 * (docs/API.md, «Редактируемые страницы»). Раздел можно только заполнить
 * или опустошить.
 */
export default function AdminEditablePagesPage() {
  const {
    sections,
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
  } = useEditablePagesAdmin();

  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Разделы сайта</h1>

      <p className="max-w-prose text-base text-text-muted">
        Текстовые разделы: направления подготовки, документы, учебные планы, контакты и два блока
        главной. Набор постоянный — разделы не добавляются и не удаляются, их можно только заполнить
        или опустошить.
      </p>

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
          title="Не удалось загрузить разделы"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Разделов нет"
          description="Их заводит миграция при первом запуске бэкенда. Пустой список значит, что на этом стенде она не прошла."
        />
      )}

      {isOutOfRange && (
        <StatusBlock
          title="Такой страницы нет"
          description={`Всего страниц: ${totalPages}.`}
          action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
        />
      )}

      {(isLoading || sections.length > 0) && (
        <>
          <DataTable
            columns={editablePageColumns()}
            data={sections}
            getRowId={(section) => section.slug}
            label="Разделы сайта"
            isLoading={isLoading}
            isSwitching={isSwitching}
          />

          <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
        </>
      )}
    </div>
  );
}
