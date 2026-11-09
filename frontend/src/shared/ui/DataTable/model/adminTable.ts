import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';

/**
 * Набор возможностей таблиц админки.
 *
 * В девятой версии TanStack Table возможности подключаются поимённо,
 * а не приезжают все сразу: в бандл попадает только то, что перечислено
 * здесь. Сортировка — единственное, что нужно сегодня.
 *
 * Модели строк (`sortedRowModel`, `filteredRowModel`, `paginatedRowModel`)
 * не подключены намеренно: они сортируют, фильтруют и режут на страницы
 * **загруженный массив**, а у нас на руках всегда одна страница из двадцати
 * записей, которую отобрал и отсортировал Spring. Клиентская сортировка
 * поверх неё переставляла бы двадцать строк внутри страницы и называла
 * это сортировкой списка — то же враньё, что и поиск по загруженной
 * странице (заявка B-3).
 */
export const adminTableFeatures = tableFeatures({ rowSortingFeature });

export type AdminTableFeatures = typeof adminTableFeatures;

/**
 * Колонка таблицы админки.
 *
 * `any` в третьем параметре — тип значения ячейки, и он свой у каждой
 * колонки: в одном массиве стоят строковые, числовые и кнопочные.
 * Так же объявлен и результат `columns()` в самой библиотеке; `unknown`
 * здесь не подходит — параметр инвариантен, и колонка со `string`
 * в такой массив не встанет.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminColumn<TData extends RowData> = ColumnDef<AdminTableFeatures, TData, any>;

/**
 * Помощник для описания колонок: `const column = adminColumns<Subject>()`,
 * дальше `column.accessor('name', {...})` и `column.display({...})`.
 *
 * Через помощник, а не литералами: он выводит тип значения ячейки
 * из ключа записи, и опечатка в имени поля становится ошибкой сборки,
 * а не пустой колонкой на экране.
 */
export function adminColumns<TData extends RowData>() {
  return createColumnHelper<AdminTableFeatures, TData>();
}
