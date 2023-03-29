import { Suspense, useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { createColumnHelper, Table, TableSkeleton } from 'ui-components';

import { getUserApiClient } from '@/api/api';
import { ModelUser } from '@/api/generated/models/ModelUser';
import { SettingsTab } from '@/features/settings/components/SettingsTab';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
type LoaderDataType = {
  message?: string;
  data?: ModelUser[];
};
const getUsers = async (): Promise<LoaderDataType> => {
  const usersPromise = await makeRequest({
    apiFunction: getUserApiClient().getUsers,
    apiArgs: [],
  });

  if (ApiError.isApiError(usersPromise)) {
    return {
      message: 'Error in getting users list',
    };
  }

  return {
    data: usersPromise,
  };
};
const loader = async (): Promise<TypedDeferredData<LoaderDataType>> => {
  return typedDefer({
    data: getUsers(),
  });
};
const UserManagement = () => {
  const columnHelper = createColumnHelper<ModelUser>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('id', {
        cell: (cell) => cell.getValue(),
        header: () => 'ID',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('first_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'First Name',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('last_name', {
        cell: (cell) => cell.getValue(),
        header: () => 'Last Name',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('email', {
        cell: (cell) => cell.getValue(),
        header: () => 'Email',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('role', {
        cell: (cell) => cell.getValue(),
        header: () => 'Role',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);
  return (
    <SettingsTab value="user-management">
      <div className="h-full mt-2 p-2">
        <Suspense fallback={<TableSkeleton columns={6} rows={5} size={'sm'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType) => {
              const { data, message } = resolvedData;
              const logs = data ?? [];

              return (
                <div>
                  <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                    User Accounts
                  </h3>
                  {message ? (
                    <p className="text-red-500 text-sm">{message}</p>
                  ) : (
                    <Table
                      size="sm"
                      data={logs}
                      columns={columns}
                      enablePagination
                      pageSize={5}
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
  element: <UserManagement />,
  loader,
};
