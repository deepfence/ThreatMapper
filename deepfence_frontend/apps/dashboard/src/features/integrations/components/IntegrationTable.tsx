import { Suspense } from 'react';
import { useLoaderData, useParams } from 'react-router-dom';
import { Table, TableSkeleton } from 'ui-components';

import { ModelIntegrationListResp } from '@/api/generated';
import { DFAwait } from '@/utils/suspense';

import { useIntegrationTableColumn } from './useIntegrationTableColumn';

type LoaderDataType = {
  message?: string;
  data?: ModelIntegrationListResp[];
};

export const IntegrationTable = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useIntegrationTableColumn();

  return (
    <div className="self-start">
      <Suspense fallback={<TableSkeleton columns={4} rows={5} size={'sm'} />}>
        <DFAwait resolve={loaderData?.data}>
          {(resolvedData: LoaderDataType) => {
            const { data = [], message } = resolvedData ?? {};
            const params = useParams() as {
              integrationType: string;
            };

            const tableData = data.filter(
              (integration) => params.integrationType === integration.integration_type,
            );

            return (
              <div>
                {message ? (
                  <p className="text-red-500 text-sm">{message}</p>
                ) : (
                  <Table size="sm" data={tableData} columns={columns} enablePagination />
                )}
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </div>
  );
};
