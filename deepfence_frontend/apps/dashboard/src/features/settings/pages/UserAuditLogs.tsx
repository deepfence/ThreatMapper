import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  createColumnHelper,
  IconButton,
  Table,
  TableNoDataElement,
  TableSkeleton,
  Tooltip,
} from 'ui-components';

import { PostgresqlDbGetAuditLogsRow } from '@/api/generated';
import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';
import { getPageFromSearchParams } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

const useUserActivityLogs = () => {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.setting.listUserActivityLogs({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
    }),
    keepPreviousData: true,
  });
};
const AuditTable = () => {
  const columnHelper = createColumnHelper<PostgresqlDbGetAuditLogsRow>();

  const { copy, isCopied } = useCopyToClipboardState();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data } = useUserActivityLogs();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('created_at', {
        cell: (cell) => (
          <TruncatedText text={formatMilliseconds(cell.getValue() || '')} />
        ),
        header: () => <TruncatedText text={'Timestamp'} />,
        minSize: 30,
        size: 35,
        maxSize: 40,
        enableSorting: false,
      }),
      columnHelper.accessor('event', {
        cell: (cell) => cell.getValue(),
        header: () => 'Event',
        minSize: 30,
        size: 30,
        maxSize: 40,
        enableSorting: false,
      }),
      columnHelper.accessor('action', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => <TruncatedText text={'Action'} />,
        minSize: 20,
        size: 25,
        maxSize: 30,
        enableSorting: false,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'User email',
        minSize: 30,
        size: 50,
        maxSize: 60,
        enableSorting: false,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => <TruncatedText text={'User role'} />,
        minSize: 30,
        size: 30,
        maxSize: 35,
        enableSorting: false,
      }),
      columnHelper.accessor('resources', {
        cell: (cell) => {
          return (
            <div className="flex gap-x-2 items-center">
              <Tooltip placement="right" content={'Copy'} triggerAsChild>
                <IconButton
                  size="sm"
                  variant="outline"
                  onClick={() => copy(cell.row.original.resources ?? '')}
                  icon={
                    <span className="w-3 h-3">
                      <CopyLineIcon />
                    </span>
                  }
                />
              </Tooltip>
              <TruncatedText text={cell.getValue() ?? ''} />
            </div>
          );
        },
        header: () => <TruncatedText text={'Resources'} />,
        minSize: 50,
        size: 80,
        maxSize: 85,
        enableSorting: false,
      }),
      columnHelper.accessor('success', {
        cell: (cell) => String(cell.getValue()),
        header: () => 'Success',
        minSize: 30,
        size: 30,
        maxSize: 40,
        enableSorting: false,
      }),
    ];
    return columns;
  }, []);

  useEffect(() => {
    if (isCopied) {
      toast.message('Text copied');
    }
  }, [isCopied]);

  return (
    <div className="mt-2">
      {data.message ? (
        <p className="text-status-error text-p7">{data.message}</p>
      ) : (
        <Table
          size="default"
          data={data.data || []}
          columns={columns}
          enablePagination
          enablePageResize
          manualPagination
          enableColumnResizing
          approximatePagination
          totalRows={data?.pagination?.totalRows}
          pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
          pageIndex={data?.pagination?.currentPage}
          onPaginationChange={(updaterOrValue) => {
            let newPageIndex = 0;
            if (typeof updaterOrValue === 'function') {
              newPageIndex = updaterOrValue({
                pageIndex: data?.pagination?.currentPage ?? 0,
                pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
              }).pageIndex;
            } else {
              newPageIndex = updaterOrValue.pageIndex;
            }
            setSearchParams((prev) => {
              prev.set('page', String(newPageIndex));
              return prev;
            });
          }}
          onPageResize={(newSize) => {
            setSearchParams((prev) => {
              prev.set('size', String(newSize));
              prev.delete('page');
              return prev;
            });
          }}
          noDataElement={<TableNoDataElement text="No user audit logs available" />}
        />
      )}
    </div>
  );
};
const UserAuditLogs = () => {
  return (
    <div className="h-full">
      <div className="mt-2">
        <h3 className="text-h6 text-text-input-value">User audit logs</h3>
      </div>
      <Suspense
        fallback={
          <TableSkeleton
            columns={7}
            rows={DEFAULT_PAGE_SIZE}
            size={'default'}
            className="mt-4"
          />
        }
      >
        <AuditTable />
      </Suspense>
    </div>
  );
};

export const module = {
  element: <UserAuditLogs />,
};
