import { useEffect, useMemo, useState } from 'react';
import { HiDotsVertical } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
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
import {
  ApiDocsBadRequestResponse,
  ModelKubernetesCluster,
  SearchSearchNodeReq,
} from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
} from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
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
          filter_in: null,
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
  const clusterData = await makeRequest({
    apiFunction: getSearchApiClient().searchKubernetesClusters,
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
  if (ApiError.isApiError(clusterData)) {
    throw clusterData.value();
  }
  const clustersDataCount = await makeRequest({
    apiFunction: getSearchApiClient().countKubernetesClusters,
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
  if (ApiError.isApiError(clustersDataCount)) {
    throw clustersDataCount;
  }

  if (clusterData === null) {
    return {
      clusters: [],
      currentPage: 0,
      totalRows: 0,
    };
  }
  return {
    clusters: clusterData,
    currentPage: page,
    totalRows: page * PAGE_SIZE + clustersDataCount.count,
  };
};

function getScanOptions(
  scanType: ScanTypeEnum,
  id: string,
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: MalwareScanNodeTypeEnum.kubernetes_cluster,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: MalwareScanNodeTypeEnum.kubernetes_cluster,
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: MalwareScanNodeTypeEnum.kubernetes_cluster,
      },
    };
  }
  if (scanType === ScanTypeEnum.ComplianceScan) {
    return {
      showAdvancedOptions: true,
      scanType,
      data: {
        nodeIds: [id],
        nodeType: ComplianceScanNodeTypeEnum.kubernetes_cluster,
      },
    };
  }

  throw new Error('invalid scan type');
}
const ActionDropdown = ({ id }: { id: string }) => {
  const [selectedScanType, setSelectedScanType] = useState<
    | typeof ScanTypeEnum.VulnerabilityScan
    | typeof ScanTypeEnum.SecretScan
    | typeof ScanTypeEnum.MalwareScan
    | typeof ScanTypeEnum.ComplianceScan
  >();

  return (
    <>
      <ConfigureScanModal
        open={!!selectedScanType}
        onOpenChange={() => setSelectedScanType(undefined)}
        scanOptions={selectedScanType ? getScanOptions(selectedScanType, id) : undefined}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              onClick={() => setSelectedScanType(ScanTypeEnum.VulnerabilityScan)}
            >
              <div className="w-4 h-4">
                <VulnerabilityIcon />
              </div>
              Start Vulnerability Scan
            </DropdownItem>
            <DropdownItem onClick={() => setSelectedScanType(ScanTypeEnum.SecretScan)}>
              <div className="w-4 h-4">
                <SecretsIcon />
              </div>
              Start Secret Scan
            </DropdownItem>
            <DropdownItem onClick={() => setSelectedScanType(ScanTypeEnum.MalwareScan)}>
              <div className="w-4 h-4">
                <MalwareIcon />
              </div>
              Start Malware Scan
            </DropdownItem>
            <DropdownItem
              onClick={() => setSelectedScanType(ScanTypeEnum.ComplianceScan)}
            >
              <div className="w-4 h-4">
                <PostureIcon />
              </div>
              Start Compliance Scan
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            <HiDotsVertical />
          </IconContext.Provider>
        </Button>
      </Dropdown>
    </>
  );
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
                  showAdvancedOptions: false,
                  scanType: ScanTypeEnum.VulnerabilityScan,
                  data: {
                    nodeIds,
                    nodeType: MalwareScanNodeTypeEnum.kubernetes_cluster,
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
                  showAdvancedOptions: false,
                  scanType: ScanTypeEnum.SecretScan,
                  data: {
                    nodeIds,
                    nodeType: MalwareScanNodeTypeEnum.kubernetes_cluster,
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
                  showAdvancedOptions: false,
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
                  showAdvancedOptions: false,
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
              <span>Start Compliance Scan</span>
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

  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();

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
                      nodeType: 'cluster',
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
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => <ActionDropdown id={cell.row.original.node_id} />,
        header: () => '',
        minSize: 50,
        size: 50,
        maxSize: 50,
        enableResizing: false,
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
          <div className="pl-4 text-sm">No rows selected</div>
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
