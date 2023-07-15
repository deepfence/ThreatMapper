import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  createColumnHelper,
  IconButton,
  Table,
  TableSkeleton,
  Tooltip,
} from 'ui-components';

import { PostgresqlDbGetAuditLogsRow } from '@/api/generated';
import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';

const DEFAULT_PAGE_SIZE = 10;

const useUserActivityLogs = () => {
  return useSuspenseQuery({
    ...queries.setting.listUserActivityLogs(),
    keepPreviousData: true,
  });
};
const AuditTable = () => {
  const columnHelper = createColumnHelper<PostgresqlDbGetAuditLogsRow>();

  const { copy, isCopied } = useCopyToClipboardState();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

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
      }),
      columnHelper.accessor('event', {
        cell: (cell) => cell.getValue(),
        header: () => 'Event',
        minSize: 30,
        size: 30,
        maxSize: 40,
      }),
      columnHelper.accessor('action', {
        cell: (cell) => <TruncatedText text={cell.getValue() ?? ''} />,
        header: () => <TruncatedText text={'Action'} />,
        minSize: 20,
        size: 25,
        maxSize: 30,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'User Email',
        minSize: 30,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => <TruncatedText text={'User Role'} />,
        minSize: 30,
        size: 30,
        maxSize: 35,
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
        <p className="dark:text-status-error text-p7">{data.message}</p>
      ) : (
        <Table
          size="default"
          data={data.data || []}
          columns={columns}
          enablePagination
          pageSize={pageSize}
          enablePageResize
          onPageResize={(newSize) => {
            setPageSize(newSize);
          }}
          enableSorting
        />
      )}
    </div>
  );
};
const UserAuditLogs = () => {
  return (
    <div className="h-full">
      <div className="mt-2">
        <h3 className="text-h6 dark:text-text-input-value">User audit logs</h3>
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
