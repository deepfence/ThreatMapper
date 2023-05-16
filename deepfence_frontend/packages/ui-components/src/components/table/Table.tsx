import {
  Cell,
  ColumnDef,
  ColumnHelper,
  createColumnHelper,
  DisplayColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Header,
  HeaderGroup,
  OnChangeFn,
  PaginationState,
  Row,
  RowData,
  RowModel,
  RowSelectionOptions,
  RowSelectionState,
  SortingState,
  Table,
  TableOptions,
  useReactTable,
} from '@tanstack/react-table';
import cx from 'classnames';
import { isNil, once } from 'lodash-es';
import {
  createContext,
  forwardRef,
  Fragment,
  ReactElement,
  Ref,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useImperativeHandle } from 'react';
import { IconContext } from 'react-icons';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { HiChevronDown, HiChevronUp, HiOutlineSelector } from 'react-icons/hi';
import { twMerge } from 'tailwind-merge';

import IconButton from '@/components/button/IconButton';
import { Checkbox } from '@/components/checkbox/Checkbox';
import Pagination from '@/components/pagination/Pagination';
import { Typography } from '@/components/typography/Typography';

type SizeOf = 'sm' | 'md';
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
  enableRowSelection?: RowSelectionOptions<TData>['enableRowSelection'];
  enableSubRowSelection?: RowSelectionOptions<TData>['enableSubRowSelection'];
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  rowSelectionState?: RowSelectionState;
  getRowId?: TableOptions<TData>['getRowId'];
  size?: SizeOf;
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
  getTdProps?: (cell: Cell<TData, unknown>) => React.ComponentProps<'td'>;
  getTrProps?: (row: Row<TData>, rowIdx: number) => React.ComponentProps<'tr'>;
  getSubRows?: (originalRow: TData, index: number) => TData[] | undefined;
  noDataText?: string;
  approximatePagination?: boolean;
}

interface TableContextValues<TData extends RowData> {
  striped?: boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
  getTdProps?: (cell: Cell<TData, unknown>) => React.ComponentProps<'td'>;
  getTrProps?: (row: Row<TData>, rowIdx: number) => React.ComponentProps<'tr'>;
}

const createTableContext = once(<TData extends RowData>() =>
  createContext<TableContextValues<TData>>({}),
);
function useTableContext<TData extends RowData>() {
  return useContext(createTableContext<TData>());
}

const CustomTable = <TData extends RowData>(
  props: TableProps<TData>,
  ref: Ref<Table<TData>>,
) => {
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
    enableSubRowSelection,
    onRowSelectionChange,
    rowSelectionState,
    getRowId,
    size = 'md',
    getSubRows,
    getTdProps,
    getTrProps,
    expanded,
    onExpandedChange,
    noDataText = 'No data',
    approximatePagination,
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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand,
    columnResizeMode: 'onChange',
    enableColumnResizing,
    enableSorting,
    getSubRows,
    enableRowSelection,
    enableSubRowSelection,
    ...(enablePagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
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
      ...(enableSorting && sortingState
        ? {
            sorting: sortingState,
          }
        : {}),
      ...(enableRowSelection && rowSelectionState
        ? {
            rowSelection: rowSelectionState,
          }
        : {}),
      ...(!isNil(expanded) ? { expanded } : {}),
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
    ...(enableSorting && manualSorting ? { manualSorting: true } : {}),
    ...(enableSorting && onSortingChange ? { onSortingChange } : {}),
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
    ...(!isNil(onExpandedChange) ? { onExpandedChange } : {}),
  });

  const [headerGroups, rowModel] = [table.getHeaderGroups(), table.getRowModel()];

  useImperativeHandle(ref, () => table, [table]);

  return (
    <TableContext.Provider
      value={{ striped, renderSubComponent, getTdProps, getTrProps }}
    >
      <div
        className={cx(
          `overflow-x-auto overflow-y-hidden`,
          `shadow-[0px_1px_3px_rgba(0,_0,_0,_0.1),_0px_1px_2px_-1px_rgba(0,_0,_0,_0.1)] dark:shadow-sm`,
          `rounded-lg dark:border dark:border-gray-700`,
        )}
      >
        <table
          className={cx(
            `w-full bg-white dark:bg-gray-800 border-spacing-0 border-collapse table-fixed`,
          )}
          cellPadding="0"
          cellSpacing="0"
        >
          <TableHead headerGroups={headerGroups} size={size} />
          {rowModel.rows.length ? (
            <TableBody rowModel={rowModel} size={size} />
          ) : (
            <tbody>
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  className="p-4 text-center text-gray-500 dark:text-gray-400"
                >
                  {noDataText}
                </td>
              </tr>
            </tbody>
          )}
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
            approximatePagination={approximatePagination}
          />
        </div>
      ) : null}
    </TableContext.Provider>
  );
};

function TableHead<TData>({
  headerGroups,
  size,
}: {
  headerGroups: HeaderGroup<TData>[];
  size: SizeOf;
}) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-700">
      {headerGroups.map((headerGroup) => (
        <tr key={headerGroup.id} data-testid="table-header-row">
          {headerGroup.headers.map((header) => (
            <Th header={header} key={header.id} size={size} />
          ))}
        </tr>
      ))}
    </thead>
  );
}

function Th<TData>({
  header,
  size = 'md',
}: {
  header: Header<TData, unknown>;
  size: SizeOf;
}) {
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
      <div
        className={cx(`w-full h-full flex px-4 truncate`, {
          ['py-3']: size === 'sm',
          ['p-4']: size === 'md',
        })}
      >
        <span className="flex-1 truncate text-start">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </span>
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
          onClick={(e) => {
            e.stopPropagation();
          }}
          className={`absolute right-0 top-3 bottom-3 w-1 rounded-full bg-gray-200 dark:bg-gray-600 cursor-col-resize select-none`}
          aria-hidden="true"
          data-testid={`column-resizer-${header.id}`}
        />
      )}
    </th>
  );
}

function TableBody<TData>({
  rowModel,
  size,
}: {
  rowModel: RowModel<TData>;
  size: SizeOf;
}) {
  const { striped, renderSubComponent, getTdProps, getTrProps } =
    useTableContext<TData>();
  return (
    <tbody>
      {rowModel.rows.map((row, rowIdx) => {
        const rowProps = getTrProps?.(row, rowIdx);
        return (
          <Fragment key={row.id}>
            <tr
              {...rowProps}
              className={twMerge(
                cx(
                  {
                    'bg-gray-50 dark:bg-gray-700': striped && row.index % 2 !== 0,
                    '!bg-gray-100 dark:!bg-gray-600': row.getIsSelected(),
                  },
                  `hover:!bg-gray-100 dark:hover:!bg-gray-700`,
                  'transition-colors',
                ),
                rowProps?.className ?? '',
              )}
            >
              {row.getVisibleCells().map((cell) => {
                return (
                  <Td
                    {...getTdProps?.(cell)}
                    rowIdx={rowIdx}
                    cell={cell}
                    key={cell.id}
                    totalRows={rowModel.rows.length}
                    size={size}
                  />
                );
              })}
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
        );
      })}
    </tbody>
  );
}

function Td<TData>({
  cell,
  totalRows,
  rowIdx,
  size,
  ...rest
}: React.ComponentProps<'td'> & {
  cell: Cell<TData, unknown>;
  totalRows: number;
  rowIdx: number;
  size?: SizeOf;
}) {
  const { striped } = useTableContext<TData>();
  if (!isNil(rest.colSpan) && rest.colSpan === 0) return null;
  return (
    <td
      {...rest}
      key={cell.id}
      style={{ width: cell.column.getSize() }}
      className={twMerge(
        cx(
          `text-sm text-gray-900 dark:text-white px-4 truncate min-w-0`,
          Typography.weight.normal,
          {
            'border-b border-gray-200 dark:border-gray-700':
              !striped && rowIdx !== totalRows - 1,
            ['py-2']: size === 'sm',
            ['py-4']: !size || size === 'md',
          },
        ),
        rest.className ?? '',
      )}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

export function getRowExpanderColumn<TData extends RowData>(
  columnHelper?: ColumnHelper<TData>,
  options?: Omit<DisplayColumnDef<TData, unknown>, 'id' | 'enableResizing'>,
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
  options?: Omit<DisplayColumnDef<TData, unknown>, 'id' | 'enableResizing'>,
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
          onClick={(e) => e.stopPropagation()}
        />
      );
    },
    cell: ({ row }) => {
      return (
        <Checkbox
          checked={row.getIsSomeSelected() ? 'indeterminate' : row.getIsSelected()}
          onCheckedChange={(state) => {
            if (row.getCanSelect()) {
              row.toggleSelected(state === true);
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    },
    enableResizing: false,
    ...options,
  });
}

// https://stackoverflow.com/a/58473012
const CustomTableWithRef = forwardRef(CustomTable) as <TData extends RowData>(
  props: TableProps<TData> & { ref?: Ref<Table<TData>> },
) => ReactElement;

export { createColumnHelper, CustomTableWithRef as Table };
export type {
  ExpandedState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Table as TableInstance,
};
