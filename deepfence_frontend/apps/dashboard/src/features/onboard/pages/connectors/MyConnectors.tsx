import { startCase } from 'lodash-es';
import { Suspense, useMemo, useRef, useState } from 'react';
import {
  HiChevronDown,
  HiChevronRight,
  HiCubeTransparent,
  HiRefresh,
} from 'react-icons/hi';
import { Await, useLoaderData, useRevalidator } from 'react-router-dom';
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

import {
  getCloudNodesApiClient,
  getRegistriesApiClient,
  getTopologyApiClient,
} from '@/api/api';
import { DFLink } from '@/components/DFLink';
import { NoConnectors } from '@/features/onboard/components/connectors/NoConnectors';
import { connectorLayoutTabs } from '@/features/onboard/layouts/ConnectorsLayout';
import { ApiError, makeRequest } from '@/utils/api';
import { getRegistryDisplayId } from '@/utils/registry';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { usePageNavigation } from '@/utils/usePageNavigation';

export interface OnboardConnectionNode {
  id: string;
  // url friendly id of the node
  urlId: string;
  // url friendly api type of the node
  urlType: string;
  // applies only to the parent node
  count?: number;
  // account type to display in the table
  accountType: string;
  // connection method to display in the table
  connectionMethod?: string;
  // account id to display in the table
  accountId?: string;
  active?: boolean;
  connections?: OnboardConnectionNode[];
}

type LoaderData = {
  data: Array<OnboardConnectionNode>;
};

async function getConnectorsData(): Promise<Array<OnboardConnectionNode>> {
  const awsResultsPromise = makeRequest({
    apiFunction: getCloudNodesApiClient().listCloudNodeAccount,
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
        graphTopologyFilters: {
          cloud_filter: [],
          field_filters: {
            contains_filter: { filter_in: null },
            order_filter: null as any,
          },
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
        },
      },
    ],
  });
  const kubernetesResultsPromise = makeRequest({
    apiFunction: getTopologyApiClient().getKubernetesTopologyGraph,
    apiArgs: [
      {
        graphTopologyFilters: {
          cloud_filter: [],
          field_filters: {
            contains_filter: { filter_in: null },
            order_filter: null as any,
          },
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
        },
      },
    ],
  });
  const registriesResultsPromise = makeRequest({
    apiFunction: getRegistriesApiClient().listRegistries,
    apiArgs: [],
  });
  const [awsResults, hostsResults, kubernetesResults, registriesResults] =
    await Promise.all([
      awsResultsPromise,
      hostsResultsPromise,
      kubernetesResultsPromise,
      registriesResultsPromise,
    ]);

  if (
    ApiError.isApiError(awsResults) ||
    ApiError.isApiError(hostsResults) ||
    ApiError.isApiError(kubernetesResults) ||
    ApiError.isApiError(registriesResults)
  ) {
    // TODO(manan) handle error cases
    return [];
  }

  const data: LoaderData['data'] = [];
  if (awsResults.total) {
    data.push({
      id: 'aws',
      urlId: 'aws',
      urlType: 'aws',
      accountType: 'AWS',
      count: awsResults.total,
      connections: (
        awsResults.cloud_node_accounts_info?.map((result) => ({
          id: `aws-${result.node_id}`,
          urlId: result.node_id ?? '',
          accountType: 'AWS',
          urlType: 'aws',
          connectionMethod: 'Terraform',
          accountId: result.node_name ?? '-',
          active: !!result.active,
        })) ?? []
      ).sort((a, b) => {
        return (a.accountId ?? '').localeCompare(b.accountId ?? '');
      }),
    });
  }

  if (hostsResults.nodes) {
    const hosts = Object.keys(hostsResults.nodes)
      .map((key) => hostsResults.nodes[key])
      .filter((node) => {
        return node.type === 'host';
      })
      .sort((a, b) => {
        return (a.label ?? a.id ?? '').localeCompare(b.label ?? b.id ?? '');
      });
    if (hosts.length) {
      data.push({
        id: 'hosts',
        urlId: 'hosts',
        urlType: 'host',
        accountType: 'Linux Hosts',
        count: hosts.length,
        connections: hosts.map((host) => ({
          id: `hosts-${host.id}`,
          urlId: host.id ?? '',
          urlType: 'host',
          accountType: 'Host',
          connectionMethod: 'Agent',
          accountId: host.label ?? host.id ?? '-',
          active: true,
        })),
      });
    }
  }
  if (kubernetesResults.nodes) {
    const clusters = Object.keys(kubernetesResults.nodes)
      .map((key) => kubernetesResults.nodes[key])
      .filter((node) => {
        return node.type === 'kubernetes_cluster';
      })
      .sort((a, b) => {
        return (a.label ?? a.id ?? '').localeCompare(b.label ?? b.id ?? '');
      });
    if (clusters.length) {
      data.push({
        id: 'kubernetesCluster',
        urlId: 'kubernetes_cluster',
        urlType: 'kubernetes_cluster',
        accountType: 'Kubernetes Cluster',
        count: clusters.length,
        connections: clusters.map((cluster) => ({
          id: `kubernetesCluster-${cluster.id}`,
          urlId: cluster.id ?? '',
          urlType: 'kubernetes_cluster',
          accountType: 'Kubernetes Cluster',
          connectionMethod: 'Agent',
          accountId: cluster.label ?? cluster.id ?? '-',
          active: true,
        })),
      });
    }
  }

  if (registriesResults.length) {
    data.push({
      id: 'registry',
      urlId: 'registry',
      urlType: 'registry',
      accountType: 'Container Registries',
      count: registriesResults.length,
      connections: registriesResults.map((registry) => ({
        id: `registry-${registry.id}`,
        urlId: `${registry.id ?? ''}`,
        urlType: 'registry',
        accountType: startCase(registry.registry_type ?? 'Registry'),
        connectionMethod: 'Registry',
        accountId: getRegistryDisplayId(registry),
        active: true,
      })),
    });
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
  const { navigate } = usePageNavigation();

  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const columnHelper = createColumnHelper<OnboardConnectionNode>();
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
            case 'kubernetesCluster':
              nodeText = 'clusters';
              break;
            case 'registry':
              nodeText = 'registries';
              break;
            default:
              nodeText = 'items';
          }
          const selectedNodesOfSameType = findSelectedNodesOfType(
            rowSelectionState,
            info.row.original,
          );
          return (
            <div className="flex gap-4">
              {info.getValue()} ({info.row.original.count ?? 0} {nodeText})
              {rowSelectionState[info.row.original.id] ? (
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/onboard/scan/choose', {
                      state: info.row.original.connections,
                    });
                  }}
                  className="flex items-center"
                >
                  <HiCubeTransparent className="mr-2" /> Configure Scan on all {nodeText}
                </DFLink>
              ) : null}
              {!rowSelectionState[info.row.original.id] &&
              selectedNodesOfSameType.length ? (
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/onboard/scan/choose', {
                      state: selectedNodesOfSameType,
                    });
                  }}
                  className="flex items-center"
                >
                  <HiCubeTransparent className="mr-2" /> Configure Scan on{' '}
                  {selectedNodesOfSameType.length} {nodeText}
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
        cell: (info) => {
          return (
            <DFLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate('/onboard/scan/choose', {
                  state: [info.row.original],
                });
              }}
              className="flex items-center"
            >
              <HiCubeTransparent className="mr-2" /> Configure Scan
            </DFLink>
          );
        },
      }),
    ],
    [rowSelectionState, navigate],
  );

  if (!data?.length) {
    return <NoConnectors />;
  }
  return (
    <>
      <RefreshButton />
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

function RefreshButton() {
  const { revalidate, state } = useRevalidator();

  return (
    <div className="flex gap-2 mb-2 items-center justify-end">
      <Button
        size="xs"
        loading={state === 'loading'}
        startIcon={<HiRefresh />}
        onClick={() => {
          revalidate();
        }}
      >
        Refresh
      </Button>
    </div>
  );
}

export const module = {
  loader,
  element: <MyConnectors />,
};

function findSelectedNodesOfType(
  selectionState: RowSelectionState,
  data: OnboardConnectionNode,
): OnboardConnectionNode[] {
  const selectedNodes: OnboardConnectionNode[] = [];
  data.connections?.forEach((node) => {
    if (node.id in selectionState) {
      selectedNodes.push(node);
    }
  });
  return selectedNodes;
}
