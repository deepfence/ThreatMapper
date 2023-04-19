import { useEffect, useMemo, useState } from 'react';
import { LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import {
  createColumnHelper,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelPod,
  SearchSearchNodeReq,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
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

  const searchSearchNodeReq: SearchSearchNodeReq = {
    node_filter: {
      filters: {
        compare_filter: null,
        contains_filter: {
          filter_in: null,
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

  if (order) {
    searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
      field_name: order.sortBy,
      descending: order.descending,
    });
  }
  const podsData = await makeRequest({
    apiFunction: getSearchApiClient().searchPods,
    apiArgs: [
      {
        searchSearchNodeReq,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{
        message?: string;
      }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });
  if (ApiError.isApiError(podsData)) {
    throw podsData.value();
  }
  const podsDataCount = await makeRequest({
    apiFunction: getSearchApiClient().countPods,
    apiArgs: [
      {
        searchSearchNodeReq: {
          ...searchSearchNodeReq,
          window: {
            ...searchSearchNodeReq.window,
            size: 10 * searchSearchNodeReq.window.size,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(podsDataCount)) {
    throw podsDataCount;
  }

  if (podsDataCount === null) {
    return {
      pods: [],
      currentPage: 0,
      totalRows: 0,
    };
  }
  return {
    pods: podsData,
    currentPage: page,
    totalRows: page * PAGE_SIZE + podsDataCount.count,
  };
};

export const PodsTable = () => {
  const fetcher = useFetcher<LoaderData>();
  const columnHelper = createColumnHelper<LoaderData['pods'][number]>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [sortState, setSortState] = useState<SortingState>([]);
  const [page, setPage] = useState(0);

  function fetchClustersData() {
    const searchParams = new URLSearchParams();
    searchParams.set('page', page.toString());

    if (sortState.length) {
      searchParams.set('sortby', sortState[0].id);
      searchParams.set('desc', String(sortState[0].desc));
    }

    fetcher.load(`/data-component/topology/table/pods?${searchParams.toString()}`);
  }

  useEffect(() => {
    fetchClustersData();
  }, [sortState, page]);

  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('pod_name', {
        cell: (info) => {
          let name = '';
          if (info.row.original.node_name.length > 0) {
            name = info.row.original.node_name;
          }
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
                  {name}
                </DFLink>
              </button>
            </div>
          );
        },
        header: () => 'Pod Name',
        minSize: 150,
        size: 160,
        maxSize: 170,
      }),
      columnHelper.accessor('kubernetes_cluster_name', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Cluster Name</span>,
        minSize: 100,
        size: 105,
        maxSize: 110,
      }),
      columnHelper.accessor('node_name', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Node Name</span>,
        minSize: 100,
        size: 105,
        maxSize: 110,
      }),
      columnHelper.accessor('kubernetes_created', {
        cell: (info) => {
          return formatMilliseconds(info.getValue());
        },
        header: () => <span>Created On</span>,
        minSize: 100,
        size: 105,
        maxSize: 110,
      }),
      columnHelper.accessor('kubernetes_is_in_host_network', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>In Host Network</span>,
        minSize: 60,
        size: 60,
        maxSize: 65,
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
