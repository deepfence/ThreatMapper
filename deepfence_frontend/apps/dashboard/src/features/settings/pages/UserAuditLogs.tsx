import { Suspense, useMemo } from 'react';
import { HiViewList } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import { useLoaderData } from 'react-router-dom';
import { createColumnHelper, Table, TableSkeleton } from 'ui-components';

import { getSettingsApiClient } from '@/api/api';
import { PostgresqlDbGetAuditLogsRow } from '@/api/generated';
import { CopyToClipboard } from '@/components/CopyToClipboard';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: PostgresqlDbGetAuditLogsRow[];
};
const getData = async (): Promise<LoaderDataType> => {
  const userApi = apiWrapper({
    fn: getSettingsApiClient().getUserActivityLogs,
  });
  const userResponse = await userApi();
  if (!userResponse.ok) {
    if (userResponse.error.response.status === 400) {
      return {
        message: userResponse.error.message,
      };
    } else if (userResponse.error.response.status === 403) {
      return {
        message: 'You do not have enough permissions to view user audit logs',
      };
    }
    throw userResponse.error;
  }

  return {
    data: userResponse.value,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getData(),
  });
};

const UserAuditLogs = () => {
  const columnHelper = createColumnHelper<PostgresqlDbGetAuditLogsRow>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('created_at', {
        cell: (cell) => formatMilliseconds(cell.getValue() || ''),
        header: () => 'Timestamp',
        minSize: 30,
        size: 35,
        maxSize: 85,
      }),
      columnHelper.accessor('event', {
        cell: (cell) => cell.getValue(),
        header: () => 'Event',
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.accessor('action', {
        cell: (cell) => cell.getValue(),
        header: () => 'Action',
        minSize: 20,
        size: 20,
        maxSize: 85,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'User Email',
        minSize: 30,
        size: 50,
        maxSize: 85,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => 'User Role',
        minSize: 30,
        size: 30,
        maxSize: 85,
      }),
      columnHelper.accessor('resources', {
        cell: (cell) => {
          return (
            <div className="relative truncate">
              <span className="mr-6">
                <CopyToClipboard
                  data={String(cell.getValue())}
                  className="top-0 left-0"
                  asIcon
                />
              </span>
              {cell.getValue()}
            </div>
          );
        },
        header: () => 'Resources',
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
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);

  return (
    <SettingsTab value="user-audit-logs">
      <div className="h-full">
        <div className="mt-2 flex gap-x-2 items-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 bg-opacity-75 dark:bg-opacity-50 flex items-center justify-center rounded-sm">
            <IconContext.Provider
              value={{
                className: 'text-blue-600 dark:text-blue-400',
              }}
            >
              <HiViewList />
            </IconContext.Provider>
          </div>
          <h3 className="font-medium text-gray-900 dark:text-white text-base">
            User Audit Logs
          </h3>
        </div>
        <Suspense
          fallback={<TableSkeleton columns={7} rows={5} size={'sm'} className="mt-4" />}
        >
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const logs = data ?? [];

              return (
                <div className="mt-4">
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
