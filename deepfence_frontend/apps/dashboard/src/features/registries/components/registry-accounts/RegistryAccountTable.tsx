import { useMemo } from 'react';
import { createColumnHelper, Table } from 'ui-components';

import { ModelRegistryListResp } from '@/api/generated';
import { DFLink } from '@/components/DFLink';

export const RegistryAccountTable = ({ data }: { data: ModelRegistryListResp[] }) => {
  const columnHelper = createColumnHelper<ModelRegistryListResp>();
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: () => 'Name',
        cell: (info) => (
          <div>
            <DFLink to={`./${info.row.original.id}`}> {info.renderValue()} </DFLink>
          </div>
        ),
        minSize: 150,
      }),
      columnHelper.accessor('created_at', {
        header: () => 'Created',
        minSize: 150,
      }),
      columnHelper.accessor('non_secret', {
        header: () => 'Credentials',
        cell: (info) => <div>{JSON.stringify(info.renderValue())}</div>,
        minSize: 150,
      }),
    ],
    [],
  );
  return <Table columns={columns} data={data} />;
};
