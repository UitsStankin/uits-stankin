import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DataTable from './index';
import { adminColumns } from './model/adminTable';

interface Row {
  id: number;
  name: string;
}

const column = adminColumns<Row>();

const COLUMNS = column.columns([
  column.accessor('name', { header: 'Название' }),
  column.display({
    id: 'actions',
    header: 'Действия',
    cell: ({ row }) => <button type="button">Править {row.original.name}</button>,
  }),
]);

const ROWS: Row[] = [
  { id: 1, name: 'Базы данных' },
  { id: 2, name: 'Программирование' },
];

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  return render(
    <DataTable
      columns={COLUMNS}
      data={ROWS}
      getRowId={(row) => String(row.id)}
      label="Дисциплины"
      {...props}
    />,
  );
}

describe('DataTable', () => {
  it('рисует заголовки и строки по описанию колонок', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Название' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Базы данных' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Программирование' })).toBeInTheDocument();
  });

  /** Колонка действий — не данные записи, а кнопки: рисует её сам раздел. */
  it('рисует колонку действий разметкой раздела', () => {
    renderTable();

    expect(screen.getByRole('button', { name: 'Править Базы данных' })).toBeInTheDocument();
  });

  it('показывает скелет вместо строк на первой загрузке', () => {
    renderTable({ isLoading: true });

    expect(screen.getByText('Загрузка: Дисциплины')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /**
   * Перелистывание: прошлая страница остаётся на экране притушенной,
   * и диктору об этом сообщает `aria-busy` — иначе он прочитает строки
   * прошлой страницы как актуальные.
   */
  it('помечает таблицу занятой, пока едет следующая страница', () => {
    renderTable({ isSwitching: true });

    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
  });

  describe('сортировка', () => {
    it('без порядка сортировки заголовки не нажимаются', () => {
      renderTable();

      expect(screen.queryByRole('button', { name: /Название/ })).not.toBeInTheDocument();
    });

    it('сообщает новый порядок по клику на заголовок', () => {
      const onSortingChange = vi.fn();

      renderTable({ sorting: [{ id: 'name', desc: false }], onSortingChange });

      fireEvent.click(screen.getByRole('button', { name: /Название/ }));

      expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: true }]);
    });

    /**
     * Направление объявляется атрибутом, а не стрелкой: стрелку диктор
     * не видит, `aria-sort` — единственное, из чего он узнаёт порядок.
     */
    it('объявляет направление сортировки диктору', () => {
      renderTable({ sorting: [{ id: 'name', desc: true }], onSortingChange: vi.fn() });

      expect(screen.getByRole('columnheader', { name: /Название/ })).toHaveAttribute(
        'aria-sort',
        'descending',
      );
    });

    /**
     * Сортировка серверная: таблица не переставляет строки сама.
     * Порядок в ответе — единственный источник правды, и клик по заголовку
     * обязан лишь попросить новый запрос.
     */
    it('не переставляет строки сама', () => {
      renderTable({ sorting: [{ id: 'name', desc: false }], onSortingChange: vi.fn() });

      fireEvent.click(screen.getByRole('button', { name: /Название/ }));

      const cells = screen.getAllByRole('cell').map((cell) => cell.textContent);

      expect(cells[0]).toBe('Базы данных');
    });
  });
});

/**
 * Удаление уносит строку вместе с кнопкой, в которой стоял фокус,
 * и браузер в этот момент роняет фокус на `body` — человек с клавиатуры
 * оказывается в начале страницы. Поймано на живом стенде.
 */
describe('DataTable, фокус на исчезнувшей строке', () => {
  it('оставляет фокус в таблице, когда строка с ним пропала', () => {
    const { rerender } = renderTable();

    const кнопка = screen.getByRole('button', { name: 'Править Программирование' });
    кнопка.focus();
    expect(кнопка).toHaveFocus();

    // Список перезапросили — строки приехали уже без этой.
    rerender(
      <DataTable
        columns={COLUMNS}
        data={ROWS.filter((row) => row.name !== 'Программирование')}
        getRowId={(row) => String(row.id)}
        label="Дисциплины"
      />,
    );

    expect(screen.getByRole('region', { name: 'Дисциплины' })).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });

  it('не трогает фокус, если человек ушёл из таблицы сам', () => {
    render(<button type="button">Добавить</button>);
    const { rerender } = renderTable();

    const вТаблице = screen.getByRole('button', { name: 'Править Программирование' });
    вТаблице.focus();

    // Ушли к кнопке над таблицей — дальше её судьба нас не касается.
    const снаружи = screen.getByRole('button', { name: 'Добавить' });
    fireEvent.focusOut(вТаблице, { relatedTarget: снаружи });
    снаружи.focus();

    rerender(
      <DataTable
        columns={COLUMNS}
        data={ROWS.filter((row) => row.name !== 'Программирование')}
        getRowId={(row) => String(row.id)}
        label="Дисциплины"
      />,
    );

    // Иначе перерисовка списка дёргала бы фокус под руками.
    expect(снаружи).toHaveFocus();
  });
});

/**
 * Последняя строка уносит с собой всю таблицу: раздел показывает вместо
 * неё «дисциплин пока нет», и подхватить фокус в таблице некому.
 */
describe('DataTable, удалена последняя строка', () => {
  /** Раздел: пока строки есть — таблица, кончились — пустое состояние. */
  function Section({ rows }: { rows: Row[] }) {
    return (
      <main>
        {rows.length > 0 ? (
          <DataTable
            columns={COLUMNS}
            data={rows}
            getRowId={(row) => String(row.id)}
            label="Дисциплины"
          />
        ) : (
          <p>Дисциплин пока нет</p>
        )}
      </main>
    );
  }

  it('уводит фокус в содержимое страницы, когда таблицы не стало', () => {
    const { rerender } = render(<Section rows={[ROWS[0]]} />);

    screen.getByRole('button', { name: 'Править Базы данных' }).focus();

    rerender(<Section rows={[]} />);

    expect(screen.getByText('Дисциплин пока нет')).toBeInTheDocument();
    expect(document.querySelector('main')).toHaveFocus();
    expect(document.body).not.toHaveFocus();
  });
});
