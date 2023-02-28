import { Table } from 'ui-components';

import { formatMilliseconds } from '@/utils/date';

const regData = [
  {
    created: '2020-10-01T00:00:00.000Z',
    name: 'ubuntu',
    totalImage: 21,
    totalTag: 322,
    totalScanned: 2,
    inProgress: 0,
    credentials: {},
  },
  {
    created: '2020-10-01T00:00:00.000Z',
    name: 'dhub test',
    totalImage: 54,
    totalTag: 132,
    totalScanned: 9,
    inProgress: 0,
    credentials: {},
  },
  {
    created: '2020-10-01T00:00:00.000Z',
    name: 'deepfenceio',
    totalImage: 89,
    totalTag: 123,
    totalScanned: 55,
    inProgress: 2,
    credentials: {
      'docker hub namespace': 'deepfenceio',
      'docker hub username': 'harshvkarn',
    },
  },
];
export const RegistryAccountTable = () => {
  return (
    <Table
      columns={[
        {
          cell: () => {},
          id: 'expander',
          maxSize: 10,
          minSize: 10,
          size: 10,
        },
        {
          accessorKey: 'created',
          cell: (row) => {
            return <div>{formatMilliseconds(row.created)}</div>;
          },
          minSize: 200,
        },
        {
          accessorKey: 'name',
        },
        {
          accessorKey: 'totalImage',
        },
        {
          accessorKey: 'totalTag',
        },
        {
          accessorKey: 'totalScanned',
        },
        {
          accessorKey: 'inProgress',
        },
        {
          accessorKey: 'credentials',
          cell: (row) => {
            // donot print [object Object]
            return <div>{JSON.stringify(row.credentials)}</div>;
          },
        },
      ]}
      data={regData}
    />
  );
};
