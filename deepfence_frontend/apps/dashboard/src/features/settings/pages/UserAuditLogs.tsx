import { Suspense, useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { createColumnHelper, Table, TableSkeleton } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { ModelGetAuditLogsRow } from '@/api/generated';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: ModelGetAuditLogsRow[];
};
const getData = async (): Promise<LoaderDataType> => {
  const response = await makeRequest({
    apiFunction: getSettingsApiClient().getUserActivityLogs,
    apiArgs: [],
  });

  if (ApiError.isApiError(response)) {
    return {
      message: 'Error in getting user audit logs',
    };
  }

  return {
    data: response,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(),
  });
};

const UserAuditLogs = () => {
  const columnHelper = createColumnHelper<ModelGetAuditLogsRow>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('created_at', {
        cell: (cell) => formatMilliseconds(cell.getValue() || ''),
        header: () => 'Timestamp',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('event', {
        cell: (cell) => cell.getValue(),
        header: () => 'Event',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('action', {
        cell: (cell) => cell.getValue(),
        header: () => 'Action',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'User Email',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => 'User Role',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('resources', {
        cell: (cell) => cell.getValue(),
        header: () => 'Resources',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('success', {
        cell: (cell) => String(cell.getValue()),
        header: () => 'Success',
        minSize: 30,
        size: 80,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);

  return (
    <SettingsTab value="user-audit-logs">
      <div className="h-full p-2">
        <Suspense fallback={<TableSkeleton columns={7} rows={5} size={'sm'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const logs = data ?? [];

              return (
                <div>
                  <div className="flex justify-between">
                    <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                      User Audit Logs
                    </h3>
                  </div>

                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={logs}
                      columns={columns}
                      enablePagination
                      pageSize={30}
                      enableColumnResizing
                      enableSorting
                    />
                  )}
                </div>
              );
            }}
          </DFAwait>
        </Suspense>
      </div>
    </SettingsTab>
  );
};

export const module = {
  element: <UserAuditLogs />,
  loader,
};
