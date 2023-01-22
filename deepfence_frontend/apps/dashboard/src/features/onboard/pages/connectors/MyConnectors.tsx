import { useMemo } from 'react';
import { HiCubeTransparent } from 'react-icons/hi';
import { LoaderFunction, useLoaderData } from 'react-router-dom';
import { Button, createColumnHelper, Table } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { NoConnectors } from '@/features/onboard/components/connectors/NoConnectors';

interface ConnectionNode {
  id: string;
  accountType: string;
  connectionMethod: string;
  accountId: string;
  active: boolean;
}

interface LoaderData {
  data?: Array<ConnectionNode>;
}

const loader: LoaderFunction = async (): Promise<LoaderData> => {
  return {
    data: [
      {
        id: '1',
        accountType: 'AWS',
        connectionMethod: 'Terraform',
        accountId: '12345622',
        active: true,
      },
    ],
  };
};

function MyConnectors() {
  const loaderData = useLoaderData() as LoaderData;

  const columnHelper = createColumnHelper<ConnectionNode>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('accountType', {
        cell: (info) => info.getValue(),
        header: () => 'Account Type',
      }),
      columnHelper.accessor('connectionMethod', {
        cell: (info) => info.getValue(),
        header: () => 'Connection Method',
      }),
      columnHelper.accessor('accountId', {
        header: () => 'Account ID',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('active', {
        header: () => 'Active',
        cell: (info) => {
          const value = info.getValue();
          return value ? 'Yes' : 'No';
        },
      }),
      columnHelper.display({
        id: 'actions',
        cell: () => {
          return (
            <DFLink to="/onboard/scan/choose" className="flex items-center">
              <HiCubeTransparent className="mr-2" /> Configure Scan
            </DFLink>
          );
        },
      }),
    ],
    [],
  );

  if (!loaderData.data?.length) {
    return <NoConnectors />;
  }
  return (
    <div className="-mt-8">
      <Filters />
      <Table size="sm" data={loaderData.data} columns={columns} />
    </div>
  );
}

function Filters() {
  return (
    <div className="flex gap-2 mb-2 items-center justify-end">
      <div className="text-gray-500 dark:text-gray-300 text-sm">Filter by</div>
      <Button color="primary" size="xs" pill outline>
        All
      </Button>
      <Button color="primary" size="xs" pill outline>
        AWS
      </Button>
      <Button color="primary" size="xs" pill outline>
        GCP
      </Button>
    </div>
  );
}

export const module = {
  loader,
  element: <MyConnectors />,
};
