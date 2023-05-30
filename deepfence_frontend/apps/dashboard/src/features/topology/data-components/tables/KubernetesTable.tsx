import { useEffect, useMemo, useState } from 'react';
import { LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelKubernetesCluster, SearchSearchNodeReq } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { getPageFromSearchParams } from '@/utils/table';

type LoaderData = {
  clusters: ModelKubernetesCluster[];
  currentPage: number;
  totalRows: number;
};
const PAGE_SIZE = 20;
const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const searchParams = new URL(request.url).searchParams;
  const page = getPageFromSearchParams(searchParams);
  const searchSearchNodeReq: SearchSearchNodeReq = {
    node_filter: {
      filters: {
        compare_filter: null,
        contains_filter: {
          filter_in: {
            active: [true],
          },
        },
        match_filter: {
          filter_in: null,
        },
        order_filter: {
          order_fields: null,
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
  const searchKubernetesClustersApi = apiWrapper({
    fn: getSearchApiClient().searchKubernetesClusters,
  });
  const clusterData = await searchKubernetesClustersApi({
    searchSearchNodeReq,
  });
  if (!clusterData.ok) {
    throw clusterData.error;
  }

  const countKubernetesClustersApi = apiWrapper({
    fn: getSearchApiClient().countKubernetesClusters,
  });
  const clustersDataCount = await countKubernetesClustersApi({
    searchSearchNodeReq: {
      ...searchSearchNodeReq,
      window: {
        ...searchSearchNodeReq.window,
        size: 10 * searchSearchNodeReq.window.size,
      },
    },
  });

  if (!clustersDataCount.ok) {
    throw clustersDataCount;
  }

  if (clusterData.value === null) {
    return {
      clusters: [],
      currentPage: 0,
      totalRows: 0,
    };
  }
  return {
    clusters: clusterData.value,
    currentPage: page,
    totalRows: page * PAGE_SIZE + clustersDataCount.value.count,
  };
};

function BulkActionButton({ nodeIds }: { nodeIds: Array<string> }) {
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <Dropdown
        content={
          <>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.VulnerabilityScan,
                  data: {
                    nodeIds,
                    nodeType: VulnerabilityScanNodeTypeEnum.kubernetes_cluster,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <VulnerabilityIcon />
              </span>
              <span>Start Vulnerability Scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.SecretScan,
                  data: {
                    nodeIds,
                    nodeType: SecretScanNodeTypeEnum.kubernetes_cluster,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <SecretsIcon />
              </span>
              <span>Start Secret Scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.MalwareScan,
                  data: {
                    nodeIds,
                    nodeType: MalwareScanNodeTypeEnum.kubernetes_cluster,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <MalwareIcon />
              </span>
              <span>Start Malware Scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.ComplianceScan,
                  data: {
                    nodeIds,
                    nodeType: ComplianceScanNodeTypeEnum.kubernetes_cluster,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <PostureIcon />
              </span>
              <span>Start Posture Scan</span>
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="primary" outline>
          Actions
        </Button>
      </Dropdown>
      {!!scanOptions && (
        <ConfigureScanModal
          open
          onOpenChange={() => setScanOptions(undefined)}
          scanOptions={scanOptions}
        />
      )}
    </>
  );
}

export const KubernetesTable = () => {
  const fetcher = useFetcher<LoaderData>();
  const columnHelper = createColumnHelper<LoaderData['clusters'][number]>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [sortState, setSortState] = useState<SortingState>([]);
  const [page, setPage] = useState(0);

  function fetchClustersData() {
    const searchParams = new URLSearchParams();
    searchParams.set('page', page.toString());
    fetcher.load(
      `/data-component/topology/table/kubernetesCluster?${searchParams.toString()}`,
    );
  }

  useEffect(() => {
    fetchClustersData();
  }, [sortState, page]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 40,
        size: 40,
        maxSize: 40,
      }),
      columnHelper.accessor('node_name', {
        cell: (info) => {
          let name = '';
          if (info.row.original.node_name.length > 0) {
            name = info.row.original.node_name;
          }
          return <span className="flex-1 shrink-0 pl-2">{name}</span>;
        },
        header: () => 'name',
        minSize: 150,
        size: 160,
        maxSize: 170,
      }),
      columnHelper.accessor('node_id', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Node Id</span>,
        minSize: 150,
        size: 160,
        maxSize: 170,
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
        {selectedIds.length ? (
          <BulkActionButton nodeIds={selectedIds} />
        ) : (
          <div className="text-gray-400 pl-4 text-sm">No rows selected</div>
        )}
      </div>
      <div>
        <Table
          data={fetcher.data?.clusters ?? []}
          columns={columns}
          noDataText="No clusters are connected"
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
    </div>
  );
};

export const module = {
  loader,
};
