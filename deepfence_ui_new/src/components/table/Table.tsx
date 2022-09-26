import {
  Cell,
  ColumnDef,
  ColumnHelper,
  createColumnHelper,
  DisplayColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Header,
  HeaderGroup,
  OnChangeFn,
  PaginationState,
  Row,
  RowData,
  RowModel,
  RowSelectionState,
  SortingState,
  TableOptions,
  useReactTable,
} from '@tanstack/react-table';
import cx from 'classnames';
import { once } from 'lodash-es';
import { createContext, Fragment, useContext, useEffect, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { HiChevronDown, HiChevronUp, HiOutlineSelector } from 'react-icons/hi';

import IconButton from '../button/IconButton';
import { Checkbox } from '../checkbox/Checkbox';
import Pagination from '../pagination/Pagination';
import { Typography } from '../typography/Typography';

export interface TableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  striped?: boolean;
  enableColumnResizing?: boolean;
  enablePagination?: boolean;
  manualPagination?: boolean;
  pageIndex?: number;
  pageSize?: number;
  totalRows?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
  enableSorting?: boolean;
  manualSorting?: boolean;
  sortingState?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  enableRowSelection?: boolean;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  rowSelectionState?: RowSelectionState;
  getRowId?: TableOptions<TData>['getRowId'];
}

interface TableContextValues<TData extends RowData> {
  striped?: boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
}

const createTableContext = once(<TData extends RowData>() =>
  createContext<TableContextValues<TData>>({}),
);
function useTableContext<TData extends RowData>() {
  return useContext(createTableContext<TData>());
}

export function Table<TData extends RowData>(props: TableProps<TData>) {
  const {
    data,
    columns,
    striped,
    renderSubComponent,
    getRowCanExpand,
    enableColumnResizing = false,
    enablePagination = false,
    manualPagination,
    pageIndex = 0,
    pageSize = 10,
    totalRows = 0,
    onPaginationChange,
    enableSorting = false,
    manualSorting,
    sortingState,
    onSortingChange,
    enableRowSelection = false,
    onRowSelectionChange,
    rowSelectionState,
    getRowId,
  } = props;
  const TableContext = createTableContext<TData>();

  const [internalPaginationState, setInternalPaginationState] = useState<PaginationState>(
    {
      pageIndex,
      pageSize,
    },
  );

  // react to change in page size
  useEffect(() => {
    if (enablePagination && !manualPagination) {
      setInternalPaginationState((prev) => {
        return { ...prev, pageSize };
      });
    }
  }, [manualPagination, enablePagination, pageSize]);

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowCanExpand,
    columnResizeMode: 'onChange',
    enableColumnResizing,
    enableSorting,
    enableRowSelection,
    state: {
      ...(enablePagination && manualPagination
        ? {
            pagination: {
              pageIndex,
              pageSize,
            },
          }
        : {}),
      ...(enablePagination && !manualPagination
        ? {
            pagination: internalPaginationState,
          }
        : {}),
      ...(enableSorting && manualSorting
        ? {
            sorting: sortingState,
          }
        : {}),
      ...(enableRowSelection && rowSelectionState
        ? {
            rowSelection: rowSelectionState,
          }
        : {}),
    },
    ...(enablePagination && manualPagination
      ? {
          manualPagination: true,
          onPaginationChange,
          pageCount: totalRows ? Math.ceil(totalRows / pageSize) : -1,
        }
      : {}),
    ...(enablePagination && !manualPagination
      ? { onPaginationChange: setInternalPaginationState }
      : {}),
    ...(enableSorting && manualSorting ? { manualSorting: true, onSortingChange } : {}),
    ...(enableRowSelection
      ? {
          onRowSelectionChange,
        }
      : {}),
    ...(getRowId
      ? {
          getRowId,
        }
      : {}),
  });

  const [headerGroups, rowModel] = [table.getHeaderGroups(), table.getRowModel()];

  return (
    <TableContext.Provider value={{ striped, renderSubComponent }}>
      <div
        className={cx(
          `overflow-hidden`,
          `shadow-[0px_1px_3px_rgba(0,_0,_0,_0.1),_0px_1px_2px_-1px_rgba(0,_0,_0,_0.1)] dark:shadow-sm`,
          `rounded-lg dark:border dark:border-gray-700`,
        )}
      >
        <table
          className={cx(
            `w-full bg-white dark:bg-gray-800 border-spacing-0 border-collapse`,
          )}
          cellPadding="0"
          cellSpacing="0"
        >
          <TableHead headerGroups={headerGroups} />
          <TableBody rowModel={rowModel} />
        </table>
      </div>
      {enablePagination ? (
        <div className="mt-4 w-full" data-testid="pagination-container">
          <Pagination
            currentPage={table.getState().pagination.pageIndex + 1}
            onPageChange={(page) => {
              table.setPageIndex(page - 1);
            }}
            pageSize={table.getState().pagination.pageSize}
            totalRows={manualPagination ? totalRows : data.length}
          />
        </div>
      ) : null}
    </TableContext.Provider>
  );
}

function TableHead<TData>({ headerGroups }: { headerGroups: HeaderGroup<TData>[] }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-700">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} data-testid="table-header-row">
          {headerGroup.headers.map((header) => (
            <Th header={header} key={header.id} />
          ))}
        </tr>
      ))}
    </thead>
  );
}

function Th<TData>({ header }: { header: Header<TData, unknown> }) {
  return (
    <th
      key={header.id}
      colSpan={header.colSpan}
      className={cx(
        'relative border-0 text-gray-500 dark:text-white',
        'border-b border-gray-200 dark:border-gray-700',
        Typography.size.xs,
        Typography.weight.semibold,
        Typography.decoration.uppercase,
        { 'cursor-pointer select-none': header.column.getCanSort() },
      )}
      style={{ width: header.getSize() }}
      onClick={header.column.getToggleSortingHandler()}
    >
      <div className="w-full h-full flex p-4">
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
        {header.column.getCanSort() ? (
          <span className="ml-1 flex items-center">
            <IconContext.Provider
              value={{
                size: '0.8rem',
              }}
            >
              {header.column.getIsSorted() === 'asc' ? (
                <HiChevronUp data-testid={`column-ascending-indicator-${header.id}`} />
              ) : null}
              {header.column.getIsSorted() === 'desc' ? (
                <HiChevronDown data-testid={`column-descending-indicator-${header.id}`} />
              ) : null}
              {!header.column.getIsSorted() ? (
                <HiOutlineSelector
                  className="stroke-gray-400"
                  data-testid={`column-unsorted-indicator-${header.id}`}
                />
              ) : null}
            </IconContext.Provider>
          </span>
        ) : null}
      </div>
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`absolute right-0 top-0 h-full w-1 bg-gray-200 dark:bg-gray-600 cursor-col-resize select-none`}
          aria-hidden="true"
          data-testid={`column-resizer-${header.id}`}
        />
      )}
    </th>
  );
}

function TableBody<TData>({ rowModel }: { rowModel: RowModel<TData> }) {
  const { striped, renderSubComponent } = useTableContext<TData>();
  return (
    <tbody>
      {rowModel.rows.map((row, rowIdx) => (
        <Fragment key={row.id}>
          <tr
            className={cx(
              {
                'bg-gray-50 dark:bg-gray-700': striped && row.index % 2 !== 0,
                '!bg-gray-100 dark:!bg-gray-600': row.getIsSelected(),
              },
              `hover:!bg-gray-100 dark:hover:!bg-gray-600`,
              'transition-colors',
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <Td
                rowIdx={rowIdx}
                cell={cell}
                key={cell.id}
                totalRows={rowModel.rows.length}
              />
            ))}
          </tr>
          {row.getIsExpanded() && (
            <tr>
              <td
                colSpan={row.getVisibleCells().length}
                className="border-b border-t border-gray-200 dark:border-gray-700"
              >
                {renderSubComponent?.({ row })}
              </td>
            </tr>
          )}
        </Fragment>
      ))}
    </tbody>
  );
}

function Td<TData>({
  cell,
  totalRows,
  rowIdx,
}: {
  cell: Cell<TData, unknown>;
  totalRows: number;
  rowIdx: number;
}) {
  const { striped } = useTableContext<TData>();

  return (
    <td
      key={cell.id}
      style={{ width: cell.column.getSize() }}
      className={cx(
        `p-4 text-sm text-gray-900 dark:text-white`,
        Typography.weight.normal,
        {
          'border-b border-gray-200 dark:border-gray-700':
            !striped && rowIdx !== totalRows - 1,
        },
      )}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

export function getRowExpanderColumn<TData extends RowData>(
  columnHelper?: ColumnHelper<TData>,
  options?: Omit<
    DisplayColumnDef<TData, unknown>,
    'id' | 'header' | 'cell' | 'enableResizing'
  >,
): ColumnDef<TData, unknown> {
  const colHelper = columnHelper ?? createColumnHelper<TData>();
  return colHelper.display({
    id: 'expander',
    header: () => null,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <IconButton
          color="primary"
          icon={row.getIsExpanded() ? <FaMinus /> : <FaPlus />}
          onClick={row.getToggleExpandedHandler()}
          outline
          size="xs"
        />
      ) : null;
    },
    enableResizing: false,
    ...options,
  });
}

export function getRowSelectionColumn<TData extends RowData>(
  columnHelper?: ColumnHelper<TData>,
  options?: Omit<
    DisplayColumnDef<TData, unknown>,
    'id' | 'header' | 'cell' | 'enableResizing'
  >,
): ColumnDef<TData, unknown> {
  const colHelper = columnHelper ?? createColumnHelper<TData>();
  return colHelper.display({
    id: 'selection',
    header: ({ table }) => {
      return (
        <Checkbox
          checked={
            table.getIsSomeRowsSelected() ? 'indeterminate' : table.getIsAllRowsSelected()
          }
          onCheckedChange={(state) => {
            table.getToggleAllRowsSelectedHandler()({
              target: {
                checked: state === true,
              },
            });
          }}
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(state) => {
          row.getToggleSelectedHandler()({
            target: {
              checked: state === true,
            },
          });
        }}
      />
    ),
    enableResizing: false,
    ...options,
  });
}

export { createColumnHelper };
