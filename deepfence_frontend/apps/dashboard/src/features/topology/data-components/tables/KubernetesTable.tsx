import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelKubernetesCluster } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';

const DEFAULT_PAGE_SIZE = 25;

export const KubernetesTable = () => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  return (
    <div className="px-4 pb-4">
      <div className="py-2 flex items-center">
        <BulkActions nodeIds={selectedIds} />
      </div>

      <Suspense
        fallback={<TableSkeleton rows={DEFAULT_PAGE_SIZE} columns={3} size="default" />}
      >
        <DataTable
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
    </div>
  );
};

const BulkActions = ({ nodeIds }: { nodeIds: string[] }) => {
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!nodeIds.length}
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
              icon={<VulnerabilityIcon />}
            >
              Start Vulnerability Scan
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
              icon={<SecretsIcon />}
            >
              Start Secret Scan
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
              icon={<MalwareIcon />}
            >
              Start Malware Scan
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
              icon={<PostureIcon />}
            >
              Start Posture Scan
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          endIcon={<CaretDown />}
          disabled={!nodeIds.length}
        >
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
};

function useSearchClustersWithPagination() {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.search.clustersWithPagination({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams),
    }),
    keepPreviousData: true,
  });
}

const DataTable = ({
  rowSelectionState,
  setRowSelectionState,
}: {
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const { data } = useSearchClustersWithPagination();
  const columnHelper = createColumnHelper<ModelKubernetesCluster>();
  const [sort, setSort] = useSortingState();
  const [searchParams, setSearchParams] = useSearchParams();

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 50,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('node_name', {
        cell: (info) => {
          let name = '';
          if (info.row.original.node_name.length > 0) {
            name = info.row.original.node_name;
          } else {
            name = info.row.original.node_id;
          }
          return <TruncatedText text={name} />;
        },
        header: () => 'Name',
        minSize: 150,
        size: 160,
        maxSize: 170,
      }),
      columnHelper.accessor('node_id', {
        cell: (info) => {
          return <TruncatedText text={info.getValue() ?? ''} />;
        },
        header: () => <span>Node Id</span>,
        minSize: 150,
        size: 160,
        maxSize: 170,
      }),
    ],
    [],
  );

  return (
    <>
      <Table
        data={data.clusters ?? []}
        columns={columns}
        noDataElement={<TableNoDataElement text="No kubernetes clusters are connected" />}
        size="default"
        enableColumnResizing
        enablePagination
        manualPagination
        enableRowSelection
        approximatePagination
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={(row) => row.node_id}
        totalRows={data.totalRows}
        pageIndex={data.currentPage}
        onPaginationChange={(updaterOrValue) => {
          let newPageIndex = 0;
          if (typeof updaterOrValue === 'function') {
            newPageIndex = updaterOrValue({
              pageIndex: data.currentPage,
              pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
            }).pageIndex;
          } else {
            newPageIndex = updaterOrValue.pageIndex;
          }
          setSearchParams((prev) => {
            prev.set('page', String(newPageIndex));
            return prev;
          });
        }}
        enableSorting
        manualSorting
        sortingState={sort}
        onSortingChange={(updaterOrValue) => {
          let newSortState: SortingState = [];
          if (typeof updaterOrValue === 'function') {
            newSortState = updaterOrValue(sort);
          } else {
            newSortState = updaterOrValue;
          }
          setSearchParams((prev) => {
            if (!newSortState.length) {
              prev.delete('sortby');
              prev.delete('desc');
            } else {
              prev.set('sortby', String(newSortState[0].id));
              prev.set('desc', String(newSortState[0].desc));
            }
            return prev;
          });
          setSort(newSortState);
        }}
        pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
        enablePageResize
        onPageResize={(newSize) => {
          setSearchParams((prev) => {
            prev.set('size', String(newSize));
            prev.delete('page');
            return prev;
          });
        }}
      />
    </>
  );
};
