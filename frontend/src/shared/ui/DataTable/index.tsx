import { useRef } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useTable, type RowData, type SortingState, type Updater } from '@tanstack/react-table';

import { cn } from '@shared/lib';

import { adminTableFeatures, type AdminColumn } from './model/adminTable';
import { useRowFocusRescue } from './model/useRowFocusRescue';
import { DataTableSkeleton } from './ui/DataTableSkeleton';

interface DataTableProps<TData extends RowData> {
  columns: AdminColumn<TData>[];
  data: TData[];
  /** Ключ строки: `(subject) => String(subject.id)`. */
  getRowId: (row: TData) => string;
  /** Подпись таблицы — для диктора и для прокручиваемой области. */
  label: string;
  /** Первая загрузка: вместо строк скелет. */
  isLoading?: boolean;
  /** Едет следующая страница: прошлая остаётся на экране притушенной. */
  isSwitching?: boolean;
  /**
   * Порядок сортировки — тот, что уехал в запрос. Пропущен, если таблица
   * не сортируется вовсе; заголовки тогда обычные, без кнопок.
   */
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

/**
 * Таблица админки: заголовки, строки, сортировка по клику.
 *
 * Общая на все разделы (ARCHITECTURE §5.5): пятнадцать сущностей,
 * написанных таблицей каждая, — это пятнадцать разошедшихся вёрсток
 * и пятнадцать мест, где однажды забыли `aria-busy`. Раздел описывает
 * только колонки (`shared/ui/DataTable/model/adminTable.ts`), всё
 * остальное здесь.
 *
 * **Сортировка серверная.** `manualSorting` означает «мне уже отсортировали,
 * не трогай порядок строк»: сортирует Spring по `?sort=`, а таблица лишь
 * показывает, по какой колонке и куда. Без этого флага она переставила бы
 * двадцать загруженных строк и выдала бы это за сортировку всего списка.
 *
 * **Пагинация тоже серверная** и живёт вне таблицы — общий `Pagination`
 * портала под ней. Номер страницы у нас в адресе, а не в состоянии
 * компонента, и пагинатор один на публичную часть и на админку.
 */
export default function DataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  label,
  isLoading = false,
  isSwitching = false,
  sorting,
  onSortingChange,
}: DataTableProps<TData>) {
  const regionRef = useRef<HTMLDivElement>(null);

  // Удалённая строка не должна уносить с собой фокус — разбор в хуке.
  useRowFocusRescue(regionRef, data);

  const table = useTable({
    features: adminTableFeatures,
    columns,
    data,
    getRowId,
    manualSorting: true,
    // Клик по заголовку переключает «по возрастанию → по убыванию»
    // и обратно. Третьего состояния «без сортировки» нет: у списков
    // контракта всегда есть порядок по умолчанию, и «снятая» сортировка
    // означала бы возврат к нему — тот же порядок, но объяснить это
    // стрелкой невозможно.
    enableSortingRemoval: false,
    enableSorting: sorting !== undefined,
    state: { sorting: sorting ?? [] },
    onSortingChange: (updater: Updater<SortingState>) => {
      if (!onSortingChange) return;

      // Библиотека присылает либо новое состояние, либо функцию от старого.
      onSortingChange(typeof updater === 'function' ? updater(sorting ?? []) : updater);
    },
  });

  if (isLoading) return <DataTableSkeleton columnCount={columns.length} label={`Загрузка: ${label}`} />;

  return (
    <div className="rounded bg-white p-4 shadow-sm md:p-6">
      {/*
        Прокрутка внутри карточки, а не сжатие колонок, — как в таблице
        аспирантов: колонки на телефоне либо едут вбок внутри себя, либо
        распирают страницу целиком вместе с шапкой и подвалом.

        `tabIndex` и `role` — не украшение: до прокручиваемой области,
        не попадающей в обход табом, доберётся только тот, у кого есть
        мышь или тачскрин.
      */}
      <div
        ref={regionRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table
          className={cn(
            'w-full min-w-[36rem] text-base transition-opacity',
            isSwitching && 'opacity-50',
          )}
          // Иначе диктор прочитает строки прошлой страницы как актуальные.
          aria-busy={isSwitching}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-default text-left align-bottom text-text-heading"
              >
                {headerGroup.headers.map((header) => {
                  const sortDirection = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-3 py-2.5 font-bold"
                      // Диктор объявляет направление сортировки колонки
                      // только по этому атрибуту — стрелка ему не видна.
                      aria-sort={
                        sortDirection === 'asc'
                          ? 'ascending'
                          : sortDirection === 'desc'
                            ? 'descending'
                            : undefined
                      }
                    >
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-1 font-bold transition-colors hover:text-primary"
                        >
                          <table.FlexRender header={header} />

                          <SortIcon direction={sortDirection} />
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-default align-top last:border-b-0">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Стрелка у заголовка. Двусторонняя — у колонки, по которой сейчас
 * не сортируют: без неё непонятно, что заголовок вообще нажимается.
 */
function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp aria-hidden="true" className="size-4 text-primary" />;
  if (direction === 'desc') return <ArrowDown aria-hidden="true" className="size-4 text-primary" />;

  return <ChevronsUpDown aria-hidden="true" className="size-4 text-text-muted" />;
}
