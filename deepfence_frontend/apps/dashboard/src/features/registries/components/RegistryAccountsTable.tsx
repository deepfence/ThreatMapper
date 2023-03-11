import { capitalize } from 'lodash-es';
import { useMemo } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { createColumnHelper, Table } from 'ui-components';

import { ModelRegistryListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { formatMilliseconds } from '@/utils/date';

export const RegistryAccountsTable = ({ data }: { data: ModelRegistryListResp[] }) => {
  const { account } = useParams() as {
    account: string;
  };

  const columnHelper = createColumnHelper<ModelRegistryListResp>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => 'Name',
        cell: (info) => (
          <div>
            <DFLink
              to={generatePath('/registries/images/:account/:accountId', {
                account,
                accountId: info.row.original.id?.toString() ?? '',
              })}
            >
              {capitalize(info.getValue())}
            </DFLink>
          </div>
        ),
        minSize: 100,
        size: 110,
        maxSize: 120,
      }),
      columnHelper.accessor('created_at', {
        enableSorting: true,
        header: () => 'Created',
        minSize: 100,
        size: 110,
        maxSize: 120,
        cell: (info) => {
          if (info.getValue()) {
            return formatMilliseconds(info.getValue());
          }
          return '';
        },
      }),
      columnHelper.accessor('non_secret', {
        enableSorting: false,
        header: () => 'Credentials',
        cell: (info) => <div className="truncate">{JSON.stringify(info.getValue())}</div>,
        minSize: 120,
        size: 130,
        maxSize: 140,
      }),
    ],
    [],
  );
  return <Table columns={columns} data={data} enableSorting />;
};
