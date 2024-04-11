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
import { isNil, once } from 'lodash-es';
import {
  createContext,
  forwardRef,
  Fragment,
  ReactElement,
  ReactNode,
  Ref,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useImperativeHandle } from 'react';
import { cn } from 'tailwind-preset';

import { Checkbox } from '@/components/checkbox/Checkbox';
import Pagination from '@/components/pagination/Pagination';
import {
  TableChevronDefault,
  TableChevronDown,
  TableChevronUp,
  TableExpanderChecked,
  TableExpanderUnchecked,
} from '@/components/table/icons';
import { Dropdown, DropdownItem } from '@/main';

import EmptyBoxImg from './empty-box.png';

type SizeOf = 'compact' | 'medium' | 'default' | 'relaxed';
interface TableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  enableColumnResizing?: boolean;
  enablePagination?: boolean;
  enablePageResize?: boolean;
  onPageResize?: (pageSize: number) => void;
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
  noDataElement?: ReactNode;
  approximatePagination?: boolean;
}

interface TableContextValues<TData extends RowData> {
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

const PAGE_RESIZE_OPTIONS = [10, 25, 50, 100, 250];

const CustomTable = <TData extends RowData>(
  props: TableProps<TData>,
  ref: Ref<Table<TData>>,
) => {
  const {
    data,
    columns,
    renderSubComponent,
    getRowCanExpand,
    enableColumnResizing = false,
    enablePagination = false,
    enablePageResize = false,
    onPageResize,
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
    size = 'default',
    getSubRows,
    getTdProps,
    getTrProps,
    expanded,
    onExpandedChange,
    noDataElement = <TableNoDataElement />,
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
      setInternalPaginationState({ pageSize, pageIndex: 0 });
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
    <TableContext.Provider value={{ renderSubComponent, getTdProps, getTrProps }}>
      <div
        className={cn(
          `overflow-x-auto overflow-y-hidden`,
          `rounded-[5px] border border-bg-grid-border`,
        )}
      >
        <table
          className={cn(
            `w-full dark:bg-bg-grid-default bg-white border-spacing-0 border-collapse table-fixed`,
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
                <td colSpan={table.getVisibleLeafColumns().length}>{noDataElement}</td>
              </tr>
            </tbody>
          )}
        </table>
        {enablePagination ? (
          <div
            className="w-full dark:bg-bg-grid-header bg-white h-12 flex items-center border-t border-bg-grid-border px-4"
            data-testid="pagination-container"
          >
            {enableRowSelection && !!table.getSelectedRowModel().flatRows.length && (
              <div className="flex items-center gap-[6px]">
                <Checkbox
                  checked={
                    table.getIsSomeRowsSelected()
                      ? 'indeterminate'
                      : table.getIsAllRowsSelected()
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
                <div className="text-p4 text-text-input-value">
                  {table.getSelectedRowModel().flatRows.length}
                </div>
              </div>
            )}
            <div className="ml-auto flex gap-4 items-center">
              {enablePagination && enablePageResize && (
                <div className="text-p4 text-text-text-and-icon flex items-center gap-2">
                  Show{' '}
                  <Dropdown
                    align="end"
                    triggerAsChild
                    content={PAGE_RESIZE_OPTIONS.map((size) => {
                      return (
                        <DropdownItem
                          key={size}
                          onSelect={() => {
                            if (onPageResize) {
                              onPageResize(size);
                            }
                          }}
                          selected={size === table.getState().pagination.pageSize}
                        >
                          {size}
                        </DropdownItem>
                      );
                    })}
                  >
                    <button
                      className="text-text-input-value flex items-center gap-1 text-p3"
                      data-testid="showRowId"
                    >
                      {table.getState().pagination.pageSize}{' '}
                      <div className="h-3 w-3">
                        <TableChevronDown />
                      </div>
                    </button>
                  </Dropdown>
                </div>
              )}
              {enablePagination && enablePageResize && (
                <div className="w-[1px] bg-bg-grid-border h-4"></div>
              )}
              <div>
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
            </div>
          </div>
        ) : null}
      </div>
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
    <thead className="dark:bg-bg-grid-header bg-[#f5f5f5]">
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
  size = 'default',
}: {
  header: Header<TData, unknown>;
  size: SizeOf;
}) {
  return (
    <th
      key={header.id}
      colSpan={header.colSpan}
      className={cn(
        'relative border-0 text-text-text-and-icon',
        'border-b-[1.5px] dark:border-bg-grid-border border-[#dcdcdc]',
        'text-p11',
        { 'cursor-pointer select-none': header.column.getCanSort() },
      )}
      style={{ width: header.getSize() }}
      onClick={header.column.getToggleSortingHandler()}
    >
      <div
        className={cn(`w-full h-full flex truncate pl-4 pr-2.5 items-center`, {
          ['py-[15px]']: size === 'default',
          ['py-[9px]']: size === 'compact',
          ['py-[12px]']: size === 'medium',
          ['py-[18px]']: size === 'relaxed',
        })}
      >
        <span className="flex-1 truncate text-start">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </span>
        {header.column.getCanSort() ? (
          <span className={cn('ml-1 flex items-center w-[0.8rem] h-[0.8rem]')}>
            {header.column.getIsSorted() === 'asc' ? (
              <span className="h-4 w-4 text-accent-accent">
                <TableChevronUp data-testid={`column-ascending-indicator-${header.id}`} />
              </span>
            ) : null}
            {header.column.getIsSorted() === 'desc' ? (
              <span className="h-4 w-4 text-accent-accent">
                <TableChevronDown
                  data-testid={`column-descending-indicator-${header.id}`}
                />
              </span>
            ) : null}
            {!header.column.getIsSorted() ? (
              <span className="h-4 w-4 dark:text-text-text-and-icon text-text-helper">
                <TableChevronDefault
                  data-testid={`column-unsorted-indicator-${header.id}`}
                />
              </span>
            ) : null}
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
          className={`absolute right-0 my-auto top-0 bottom-0 w-[4px] h-4 rounded-none cursor-col-resize select-none`}
          aria-hidden="true"
          data-testid={`column-resizer-${header.id}`}
        >
          <div className="ml-[3px] w-[1px] mr-[1px] h-full dark:bg-bg-grid-border bg-[#999999]" />
        </div>
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
  const { renderSubComponent, getTdProps, getTrProps } = useTableContext<TData>();
  return (
    <tbody>
      {rowModel.rows.map((row, rowIdx) => {
        const rowProps = getTrProps?.(row, rowIdx);
        return (
          <Fragment key={row.id}>
            <tr
              {...rowProps}
              className={cn(
                `dark:hover:bg-bg-hover-2 hover:bg-bg-breadcrumb-bar`,
                {
                  'dark:!bg-bg-active-selection dark:hover:!bg-bg-active-selection/90 !bg-bg-breadcrumb-bar hover:!bg-bg-breadcrumb-bar/90':
                    row.getIsSelected(),
                },
                'transition-colors',
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
            {row.getCanExpand() && row.getIsExpanded() && (
              <tr>
                <td
                  colSpan={row.getVisibleCells().length}
                  className="border-b border-t border-bg-grid-border "
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
  size = 'default',
  ...rest
}: React.ComponentProps<'td'> & {
  cell: Cell<TData, unknown>;
  totalRows: number;
  rowIdx: number;
  size?: SizeOf;
}) {
  if (!isNil(rest.colSpan) && rest.colSpan === 0) return null;
  return (
    <td
      {...rest}
      key={cell.id}
      style={{ width: cell.column.getSize() }}
      className={cn(
        `text-[13px] font-medium leading-[18px] text-text-text-and-icon px-4 truncate min-w-0`,
        {
          'border-b border-bg-grid-border': rowIdx !== totalRows - 1,
          ['h-[48px]']: size === 'default',
          ['h-[36px]']: size === 'compact',
          ['h-[42px]']: size === 'medium',
          ['h-[54px]']: size === 'relaxed',
        },
        rest.className ?? '',
      )}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

function getRowExpanderColumn<TData extends RowData>(
  columnHelper?: ColumnHelper<TData>,
  options?: Omit<DisplayColumnDef<TData, unknown>, 'id' | 'enableResizing'>,
): ColumnDef<TData, unknown> {
  const colHelper = columnHelper ?? createColumnHelper<TData>();
  return colHelper.display({
    id: 'expander',
    header: () => null,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <button
          className="h-4 w-4 text-df-gray-600 overflow-hidden block"
          onClick={row.getToggleExpandedHandler()}
        >
          {row.getIsExpanded() ? <TableExpanderChecked /> : <TableExpanderUnchecked />}
        </button>
      ) : null;
    },
    enableResizing: false,
    ...options,
  });
}

function getRowSelectionColumn<TData extends RowData>(
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

const TableNoDataElement = ({
  text = `Sorry, we couldn't find any data!`,
  className,
}: {
  text?: string;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center min-h-[384px] w-full gap-3',
        className,
      )}
    >
      <span>
        <span className="h-[120px] w-[120px]">
          <img src={EmptyBoxImg} alt="No data" height="100%" width="100%" />
        </span>
      </span>
      <span className="text-h3 text-text-text-and-icon">{text}</span>
    </div>
  );
};

// https://stackoverflow.com/a/58473012
const CustomTableWithRef = forwardRef(CustomTable) as <TData extends RowData>(
  props: TableProps<TData> & { ref?: Ref<Table<TData>> },
) => ReactElement;

export {
  createColumnHelper,
  getRowExpanderColumn,
  getRowSelectionColumn,
  CustomTableWithRef as Table,
  TableNoDataElement,
};
export type {
  ColumnDef,
  ExpandedState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Table as TableInstance,
  TableProps,
};
