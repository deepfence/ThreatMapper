import { useEffect, useMemo, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Checkbox,
  createColumnHelper,
  IconButton,
  Popover,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelPod, SearchSearchNodeReq } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { apiWrapper } from '@/utils/api';
import { getOrderFromSearchParams, getPageFromSearchParams } from '@/utils/table';

type LoaderData = {
  pods: ModelPod[];
  currentPage: number;
  totalRows: number;
};
const PAGE_SIZE = 20;
const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const searchParams = new URL(request.url).searchParams;
  const page = getPageFromSearchParams(searchParams);
  const order = getOrderFromSearchParams(searchParams);

  const kubernetesStatus = searchParams.get('kubernetes_state');
  const hosts = searchParams.get('hosts')?.split(',') ?? [];
  const clustors = searchParams.get('clustors')?.split(',') ?? [];
  const searchSearchNodeReq: SearchSearchNodeReq = {
    node_filter: {
      filters: {
        compare_filter: null,
        contains_filter: {
          filter_in: {
            active: [true],
            ...(hosts.length ? { host_name: hosts } : {}),
            ...(clustors.length ? { kubernetes_cluster_name: clustors } : {}),
          },
        },
        match_filter: {
          filter_in: null,
        },
        order_filter: {
          order_fields: [],
        },
      },
      in_field_filter: null,
      window: {
        offset: 0,
        size: 0,
      },
    },
    window: { offset: page * PAGE_SIZE, size: PAGE_SIZE },
  };

  if (kubernetesStatus?.length) {
    let state = kubernetesStatus;
    if (kubernetesStatus === 'notRunning') {
      state = '';
    }
    searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
      ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
      kubernetes_state: [state],
    };
  }

  if (order) {
    searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
      field_name: order.sortBy,
      descending: order.descending,
    });
  }
  const searchPodsApi = apiWrapper({
    fn: getSearchApiClient().searchPods,
  });
  const podsData = await searchPodsApi({
    searchSearchNodeReq,
  });
  if (!podsData.ok) {
    throw podsData.error;
  }

  const countPodsApi = apiWrapper({
    fn: getSearchApiClient().countPods,
  });
  const podsDataCount = await countPodsApi({
    searchSearchNodeReq: {
      ...searchSearchNodeReq,
      window: {
        ...searchSearchNodeReq.window,
        size: 10 * searchSearchNodeReq.window.size,
      },
    },
  });

  if (!podsDataCount.ok) {
    throw podsDataCount.error;
  }

  if (podsDataCount.value === null) {
    return {
      pods: [],
      currentPage: 0,
      totalRows: 0,
    };
  }
  return {
    pods: podsData.value,
    currentPage: page,
    totalRows: page * PAGE_SIZE + podsDataCount.value.count,
  };
};
interface IFilters {
  kubernetesStatus: string[];
  hosts: Array<string>;
  clustors: Array<string>;
}
function Filters({
  filters,
  onFiltersChange,
}: {
  filters: IFilters;
  onFiltersChange: (filters: IFilters) => void;
}) {
  const isFilterApplied = useMemo(() => {
    return Object.values(filters).some((filter) => filter.length > 0);
  }, [filters]);

  return (
    <div className="relative ml-auto">
      {isFilterApplied && (
        <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
      )}
      <Popover
        triggerAsChild
        content={
          <div className="ml-auto w-[300px]">
            <div className="dark:text-white">
              <FilterHeader
                onReset={() => {
                  onFiltersChange({
                    kubernetesStatus: [],
                    hosts: [],
                    clustors: [],
                  });
                }}
              />
              <div className="flex flex-col gap-y-6 p-4">
                <fieldset>
                  <legend className="text-sm font-medium">Kubernetes State</legend>
                  <div className="flex gap-x-4 mt-1">
                    <Checkbox
                      label="Not Running"
                      checked={filters.kubernetesStatus.includes('notRunning')}
                      onCheckedChange={(state: boolean) => {
                        if (state) {
                          const state = filters.kubernetesStatus;
                          if (!filters.kubernetesStatus.includes('notRunning')) {
                            state.push('notRunning');
                          }
                          onFiltersChange({
                            ...filters,
                            kubernetesStatus: state,
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            kubernetesStatus: filters.kubernetesStatus.filter(
                              (state) => state !== 'notRunning',
                            ),
                          });
                        }
                      }}
                    />
                    <Checkbox
                      label="Running"
                      checked={filters.kubernetesStatus.includes('running')}
                      onCheckedChange={(state: boolean) => {
                        if (state) {
                          const state = filters.kubernetesStatus;
                          if (!filters.kubernetesStatus.includes('running')) {
                            state.push('running');
                          }
                          onFiltersChange({
                            ...filters,
                            kubernetesStatus: state,
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            kubernetesStatus: filters.kubernetesStatus.filter(
                              (state) => state !== 'running',
                            ),
                          });
                        }
                      }}
                    />
                  </div>
                </fieldset>
                <fieldset>
                  <SearchableHostList
                    scanType="none"
                    valueKey="hostName"
                    defaultSelectedHosts={filters.hosts ?? []}
                    reset={!isFilterApplied}
                    onChange={(value) => {
                      onFiltersChange({
                        ...filters,
                        hosts: [...value],
                      });
                    }}
                  />
                </fieldset>
                <fieldset>
                  <SearchableClusterList
                    defaultSelectedClusters={filters.clustors ?? []}
                    valueKey="clusterName"
                    reset={!isFilterApplied}
                    onChange={(value) => {
                      onFiltersChange({
                        ...filters,
                        clustors: [...value],
                      });
                    }}
                  />
                </fieldset>
              </div>
            </div>
          </div>
        }
      >
        <IconButton
          size="xs"
          outline
          color="primary"
          className="rounded-lg bg-transparent"
          icon={<FiFilter />}
        />
      </Popover>
    </div>
  );
}

export const PodsTable = () => {
  const fetcher = useFetcher<LoaderData>();
  const columnHelper = createColumnHelper<LoaderData['pods'][number]>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [sortState, setSortState] = useState<SortingState>([]);
  const [page, setPage] = useState(0);

  const [filters, setFilters] = useState<IFilters>({
    kubernetesStatus: [],
    hosts: [],
    clustors: [],
  });

  function fetchPodsData() {
    const searchParams = new URLSearchParams();
    searchParams.set('page', page.toString());

    if (filters.kubernetesStatus.length) {
      if (
        filters.kubernetesStatus.includes('notRunning') &&
        filters.kubernetesStatus.length === 1
      ) {
        searchParams.set('kubernetes_state', 'notRunning');
      } else if (
        filters.kubernetesStatus.includes('running') &&
        filters.kubernetesStatus.length === 1
      ) {
        searchParams.set('kubernetes_state', 'Running');
      } else {
        searchParams.delete('kubernetes_state');
      }
    }
    if (filters.hosts.length) {
      searchParams.set('hosts', filters.hosts.join(','));
    }
    if (filters.clustors.length) {
      searchParams.set('clustors', filters.clustors.join(','));
    }

    if (sortState.length) {
      searchParams.set('sortby', sortState[0].id);
      searchParams.set('desc', String(sortState[0].desc));
    }

    fetcher.load(`/data-component/topology/table/pods?${searchParams.toString()}`);
  }

  useEffect(() => {
    fetchPodsData();
  }, [filters, sortState, page]);

  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('pod_name', {
        cell: (info) => {
          return (
            <div className="flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="truncate"
              >
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setClickedItem({
                      nodeId: info.row.original.node_id!,
                      nodeType: 'pod',
                    });
                  }}
                  className="flex-1 shrink-0 pl-2"
                >
                  {info.getValue() || '-'}
                </DFLink>
              </button>
            </div>
          );
        },
        header: () => 'Pod Name',
        minSize: 130,
        size: 140,
        maxSize: 145,
      }),
      columnHelper.accessor('kubernetes_cluster_name', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Cluster Name</span>,
        minSize: 80,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('kubernetes_namespace', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Kubernetes Namespace</span>,
        minSize: 100,
        size: 105,
        maxSize: 110,
      }),
      columnHelper.accessor('kubernetes_state', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Kubernetes State</span>,
        minSize: 80,
        size: 80,
        maxSize: 90,
      }),
    ],
    [fetcher.data],
  );

  if (fetcher.state !== 'idle' && !fetcher.data) {
    return (
      <div className="mt-9">
        <TableSkeleton rows={10} columns={columns.length} size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center h-9">
        <Filters
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setPage(0);
          }}
        />
      </div>
      <div>
        <Table
          data={fetcher.data?.pods ?? []}
          columns={columns}
          noDataText="No pods are connected"
          size="sm"
          enableColumnResizing
          enablePagination
          manualPagination
          enableRowSelection
          approximatePagination
          rowSelectionState={rowSelectionState}
          onRowSelectionChange={setRowSelectionState}
          getRowId={(row) => row.node_id}
          totalRows={fetcher.data?.totalRows}
          pageSize={PAGE_SIZE}
          pageIndex={fetcher.data?.currentPage}
          onPaginationChange={(updaterOrValue) => {
            let newPageIndex = 0;
            if (typeof updaterOrValue === 'function') {
              newPageIndex = updaterOrValue({
                pageIndex: fetcher.data?.currentPage ?? 0,
                pageSize: PAGE_SIZE,
              }).pageIndex;
            } else {
              newPageIndex = updaterOrValue.pageIndex;
            }
            setPage(newPageIndex);
          }}
          enableSorting
          manualSorting
          sortingState={sortState}
          onSortingChange={setSortState}
        />
      </div>
      {clickedItem ? (
        <NodeDetailsStackedModal
          node={clickedItem}
          open={true}
          onOpenChange={(open) => {
            if (!open) setClickedItem(undefined);
          }}
        />
      ) : null}
    </div>
  );
};

export const module = {
  loader,
};
