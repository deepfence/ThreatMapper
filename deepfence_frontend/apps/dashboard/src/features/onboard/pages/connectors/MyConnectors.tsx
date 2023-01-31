import { Suspense, useMemo, useRef, useState } from 'react';
import { HiChevronDown, HiChevronRight, HiCubeTransparent } from 'react-icons/hi';
import { Await, useLoaderData } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  ExpandedState,
  getRowExpanderColumn,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
  TableSkeleton,
  Tabs,
} from 'ui-components';

import { getCloudNodesApi, getTopologyApiClient } from '@/api/api';
import { DFLink } from '@/components/DFLink';
import { NoConnectors } from '@/features/onboard/components/connectors/NoConnectors';
import { connectorLayoutTabs } from '@/features/onboard/layouts/ConnectorsLayout';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { usePageNavigation } from '@/utils/usePageNavigation';

interface ConnectionNode {
  id: string;
  count?: number;
  accountType: string;
  connectionMethod?: string;
  accountId?: string;
  active?: boolean;
  connections?: ConnectionNode[];
}

type LoaderData = {
  data: Array<ConnectionNode>;
};

async function getConnectorsData(): Promise<Array<ConnectionNode>> {
  const awsResultsPromise = makeRequest({
    apiFunction: getCloudNodesApi().listCloudNodeAccount,
    apiArgs: [
      {
        modelCloudNodeAccountsListReq: {
          cloud_provider: 'aws',
          window: {
            offset: 0,
            size: 1000000,
          },
        },
      },
    ],
  });
  const hostsResultsPromise = makeRequest({
    apiFunction: getTopologyApiClient().getHostsTopologyGraph,
    apiArgs: [
      {
        reportersTopologyFilters: {
          cloud_filter: [],
          field_filters: { contains_filter: { filter_in: null } },
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
        },
      },
    ],
  });
  const [awsResults, hostsResults] = await Promise.all([
    awsResultsPromise,
    hostsResultsPromise,
  ]);

  if (ApiError.isApiError(awsResults) || ApiError.isApiError(hostsResults)) {
    // TODO(manan) handle error cases
    return [];
  }

  const data: LoaderData['data'] = [];
  if (awsResults.total) {
    data.push({
      id: 'aws',
      accountType: 'AWS',
      count: awsResults.total,
      connections:
        awsResults.cloud_node_accounts_info?.map((result) => ({
          id: `aws${result.node_id}`,
          accountType: 'AWS',
          connectionMethod: 'Terraform',
          accountId: result.node_name ?? '-',
          active: !!result.active,
        })) ?? [],
    });
  }

  if (hostsResults.nodes) {
    const hosts = Object.keys(hostsResults.nodes)
      .map((key) => hostsResults.nodes[key])
      .filter((host) => {
        return !host.pseudo;
      });
    if (hosts.length) {
      data.push({
        id: 'hosts',
        accountType: 'Linux Hosts',
        count: hosts.length,
        connections: hosts.map((host) => ({
          id: `hosts-${host.id}`,
          accountType: 'Host',
          connectionMethod: 'Agent',
          accountId: host.label ?? host.id ?? '-',
          active: true,
        })),
      });
    }
  }

  return data;
}

const loader = (): TypedDeferredData<LoaderData> => {
  return typedDefer({
    data: getConnectorsData(),
  });
};

function MyConnectors() {
  const { navigate } = usePageNavigation();
  const navigatedRef = useRef(false);
  const loaderData = useLoaderData() as LoaderData;

  return (
    <Tabs
      value={'my-connectors'}
      tabs={connectorLayoutTabs}
      onValueChange={() => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        navigate(`/onboard/connectors/add-connectors`);
      }}
      size="md"
    >
      <div className="h-full dark:text-white">
        <Suspense
          fallback={<TableSkeleton rows={4} columns={5} size="sm" className="mt-8" />}
        >
          <Await resolve={loaderData.data}>
            {(data: LoaderData['data']) => {
              return <MyConnectorsTable data={data} />;
            }}
          </Await>
        </Suspense>
      </div>
    </Tabs>
  );
}

function MyConnectorsTable({ data }: LoaderData) {
  const [expandedState, setExpandedState] = useState<ExpandedState>(true);

  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const columnHelper = createColumnHelper<ConnectionNode>();
  const columns = useMemo(
    () => [
      getRowExpanderColumn(columnHelper, {
        minSize: 5,
        size: 5,
        maxSize: 5,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                row.getToggleExpandedHandler()();
              }}
            >
              {row.getIsExpanded() ? <HiChevronDown /> : <HiChevronRight />}
            </button>
          ) : null;
        },
      }),
      getRowSelectionColumn(columnHelper, {
        minSize: 5,
        size: 5,
        maxSize: 5,
        header: () => null,
      }),
      columnHelper.accessor('accountType', {
        size: 200,
        cell: (info) => {
          if (!info.row.original.count) {
            return info.getValue();
          }
          let nodeText = '';
          switch (info.row.original.id) {
            case 'aws':
              nodeText = 'accounts';
              break;
            case 'hosts':
              nodeText = 'hosts';
              break;
            default:
              nodeText = 'items';
          }
          return (
            <div className="flex gap-4">
              {info.getValue()} ({info.row.original.count ?? 0} {nodeText})
              {rowSelectionState[info.row.original.id] ? (
                <DFLink to="/onboard/scan/choose" className="flex items-center">
                  <HiCubeTransparent className="mr-2" /> Configure Scan on all {nodeText}
                </DFLink>
              ) : null}
              {!rowSelectionState[info.row.original.id] &&
              Object.keys(rowSelectionState).length ? (
                <DFLink to="/onboard/scan/choose" className="flex items-center">
                  <HiCubeTransparent className="mr-2" /> Configure Scan on{' '}
                  {Object.keys(rowSelectionState).length} {nodeText}
                </DFLink>
              ) : null}
            </div>
          );
        },
        header: () => 'Account Type',
      }),
      columnHelper.accessor('connectionMethod', {
        size: 200,
        cell: (info) => info.getValue(),
        header: () => 'Connection Method',
      }),
      columnHelper.accessor('accountId', {
        size: 400,
        header: () => 'Account ID',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('active', {
        size: 100,
        header: () => 'Active',
        cell: (info) => {
          const value = info.getValue();
          return value ? 'Yes' : 'No';
        },
      }),
      columnHelper.display({
        size: 200,
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
    [rowSelectionState],
  );

  if (!data?.length) {
    return <NoConnectors />;
  }
  return (
    <>
      <Filters />
      <Table
        size="sm"
        data={data}
        columns={columns}
        expanded={expandedState}
        onExpandedChange={setExpandedState}
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getSubRows={(row) => row.connections ?? []}
        getTdProps={(cell) => {
          if (cell.row.original.count) {
            let colSpan = 0;
            if ([0, 1].includes(cell.row.getAllCells().indexOf(cell))) {
              colSpan = 1;
            } else if (cell.row.getAllCells().indexOf(cell) === 2) {
              colSpan = 5;
            }
            return {
              colSpan,
              className: 'bg-gray-50 dark:bg-gray-700',
            };
          }
          return {};
        }}
        getTrProps={(row) => {
          if (row.original.count) {
            return {
              className: 'cursor-pointer',
              onClick: () => {
                row.toggleExpanded();
              },
            };
          }
          return {};
        }}
        getRowId={(row) => row.id}
      />
    </>
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
