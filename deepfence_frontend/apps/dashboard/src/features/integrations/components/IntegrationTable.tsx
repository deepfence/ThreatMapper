import { Suspense, useMemo } from 'react';
import { useLoaderData } from 'react-router-dom';
import { createColumnHelper, Table, TableSkeleton } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { DFAwait } from '@/utils/suspense';

type LoaderDataType = {
  message?: string;
  data?: ModelIntegrationListResp[];
};

export const IntegrationTable = () => {
  const columnHelper = createColumnHelper<ModelIntegrationListResp>();
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
      columnHelper.accessor('integration_type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Integration Type',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('notification_type', {
        cell: (cell) => cell.getValue(),
        header: () => 'Notification Type',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('channel', {
        cell: (cell) => cell.getValue(),
        header: () => 'Channel',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('webhook_url', {
        cell: (cell) => cell.getValue(),
        header: () => 'URL',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
    ];
    return columns;
  }, []);

  return (
    <>
      <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'sm'} />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType) => {
            const { data = [], message } = resolvedData;

            return (
              <div>
                <h3 className="py-2 font-medium text-gray-900 dark:text-white uppercase text-sm tracking-wider">
                  Console Diagnostic Logs
                </h3>
                {message ? (
                  <p className="text-red-500 text-sm">{message}</p>
                ) : (
                  <Table size="sm" data={data} columns={columns} enablePagination />
                )}
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </>
  );
};
