import {
  Cell,
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  Header,
  HeaderGroup,
  OnChangeFn,
  PaginationState,
  Row,
  RowData,
  RowModel,
  useReactTable,
} from '@tanstack/react-table';
import cx from 'classnames';
import { once } from 'lodash-es';
import { createContext, Fragment, useContext } from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa';

import IconButton from '../button/IconButton';
import Pagination from '../pagination/Pagination';
import { Typography } from '../typography/Typography';

export interface TableProps<TData extends RowData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  striped?: boolean;
  enablePagination?: boolean;
  manualPagination?: boolean;
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
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
    enablePagination,
    manualPagination,
    pageIndex = 0,
    pageSize = 10,
    pageCount = -1,
    onPaginationChange,
  } = props;
  const TableContext = createTableContext<TData>();
  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowCanExpand,
    columnResizeMode: 'onChange',
    meta: {
      striped,
    },
    state: {
      ...(manualPagination
        ? {
            pagination: {
              pageIndex,
              pageSize,
            },
          }
        : {}),
    },
    ...(manualPagination
      ? { manualPagination: true, onPaginationChange, pageCount }
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
        <div className="mt-4 flex justify-end">
          <Pagination
            currentPage={table.getState().pagination.pageIndex + 1}
            onPageChange={(page) => {
              table.setPageIndex(page - 1);
            }}
            totalPageCount={table.getPageCount()}
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
        <tr key={headerGroup.id}>
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
        'relative border-0 text-gray-500 dark:text-white p-4 text-left',
        'border-b border-gray-200 dark:border-gray-700',
        Typography.size.xs,
        Typography.weight.semibold,
        Typography.decoration.uppercase,
      )}
      style={{ width: header.getSize() }}
    >
      {header.isPlaceholder
        ? null
        : flexRender(header.column.columnDef.header, header.getContext())}
      {false && header.column.getCanResize() && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`absolute right-0 top-0 h-full w-1 bg-gray-500 cursor-col-resize select-none`}
        ></div>
      )}
    </th>
  );
}

function TableBody<TData>({ rowModel }: { rowModel: RowModel<TData> }) {
  const { striped, renderSubComponent } = useTableContext<TData>();
  return (
    <tbody>
      {rowModel.rows.map((row) => (
        <Fragment key={row.id}>
          <tr
            className={cx(
              {
                'bg-gray-50 dark:bg-gray-700': striped && row.index % 2 !== 0,
              },
              `hover:!bg-gray-100 dark:hover:!bg-gray-600`,
              'transition-colors',
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <Td cell={cell} key={cell.id} totalRows={rowModel.rows.length} />
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
}: {
  cell: Cell<TData, unknown>;
  totalRows: number;
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
            !striped && cell.row.index !== totalRows - 1,
        },
      )}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </td>
  );
}

export function RowExpander<TData extends RowData>({ row }: { row: Row<TData> }) {
  return row.getCanExpand() ? (
    <IconButton
      color="primary"
      icon={row.getIsExpanded() ? <FaMinus /> : <FaPlus />}
      onClick={row.getToggleExpandedHandler()}
      outline
      size="xs"
    />
  ) : null;
}

export { createColumnHelper };
