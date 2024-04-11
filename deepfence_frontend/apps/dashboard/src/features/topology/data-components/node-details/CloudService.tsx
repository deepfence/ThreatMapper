import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { generatePath } from 'react-router-dom';
import {
  CircleSpinner,
  createColumnHelper,
  SlidingModalContent,
  SortingState,
  Table,
  TableNoDataElement,
  Tabs,
} from 'ui-components';

import { ModelCloudResource } from '@/api/generated';
import { ConfigureScanModalProps } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { Header } from '@/features/topology/components/node-details/Header';
import { queries } from '@/queries';

function useSearchCloudResources(params: {
  resourceId: string;
  page: number;
  pageSize: number;
  cloudRegion: string;
  order?: {
    sortBy: string;
    descending: boolean;
  };
}) {
  return useSuspenseQuery({
    ...queries.search.cloudResourcesWithPagination(params),
    keepPreviousData: true,
  });
}

export const CloudService = ({
  nodeType,
  region,
  onGoBack,
  showBackBtn,
  onStartScanClick,
}: {
  nodeType: string;
  region: string;
  onGoBack: () => void;
  showBackBtn: boolean;
  onNodeClick: (nodeId: string, nodeType: string) => void;
  onStartScanClick: (scanOptions: ConfigureScanModalProps['scanOptions']) => void;
}) => {
  return (
    <>
      <Header
        onStartScanClick={onStartScanClick}
        nodeId={nodeType}
        label={nodeType}
        nodeType={nodeType}
        onGoBack={onGoBack}
        showBackBtn={showBackBtn}
        availableScanTypes={[]}
        showInstallAgentOption={false}
      />
      <SlidingModalContent>
        <div className="dark:bg-bg-header bg-bg-breadcrumb-bar">
          <Tabs
            value={'overview'}
            defaultValue={'overview'}
            tabs={[{ label: 'Overview', value: 'overview' }]}
          >
            <Suspense
              fallback={
                <div className="min-h-[300px] flex items-center justify-center dark:bg-bg-side-panel bg-white">
                  <CircleSpinner size="lg" />
                </div>
              }
            >
              <TabContent cloudRegion={region} nodeType={nodeType} />
            </Suspense>
          </Tabs>
        </div>
      </SlidingModalContent>
    </>
  );
};

function getCloudTypeFromNodeType(nodeType: string) {
  const cloudType = nodeType.split('_')[0];
  return cloudType;
}

const TabContent = ({
  cloudRegion,
  nodeType,
}: {
  cloudRegion: string;
  nodeType: string;
}) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortingState>([]);
  const { data } = useSearchCloudResources({
    cloudRegion,
    resourceId: nodeType,
    page,
    pageSize,
    order: sort.length
      ? {
          sortBy: sort[0].id,
          descending: sort[0].desc,
        }
      : undefined,
  });
  const columnHelper = createColumnHelper<ModelCloudResource>();
  const columns = useMemo(() => {
    return [
      columnHelper.accessor('node_name', {
        cell: (cell) => {
          if (cell.row.original.cloud_compliance_latest_scan_id?.length) {
            return (
              <DFLink
                target="_blank"
                to={generatePath('/posture/cloud/scan-results/:cloudType/:scanId', {
                  scanId: encodeURIComponent(
                    cell.row.original.cloud_compliance_latest_scan_id,
                  ),
                  cloudType: getCloudTypeFromNodeType(cell.row.original.node_type),
                })}
              >
                <TruncatedText
                  text={cell.row.original.node_name || cell.row.original.node_id || '-'}
                />
              </DFLink>
            );
          }
          return (
            <TruncatedText
              text={cell.row.original.node_name || cell.row.original.node_id || '-'}
            />
          );
        },
        header: () => 'Name',
        minSize: 60,
        size: 70,
        maxSize: 80,
      }),
      columnHelper.accessor('account_id', {
        cell: (cell) => {
          return <TruncatedText text={cell.getValue()} />;
        },
        header: () => 'Cloud account',
        minSize: 60,
        size: 70,
        maxSize: 80,
      }),
      columnHelper.accessor('cloud_region', {
        cell: (cell) => {
          return <TruncatedText text={cell.getValue()} />;
        },
        header: () => 'Region',
        minSize: 40,
        size: 40,
        maxSize: 60,
        enableSorting: false,
      }),
      columnHelper.accessor('cloud_compliance_scan_status', {
        cell: (cell) => {
          return <ScanStatusBadge status={cell.getValue()} />;
        },
        header: () => 'Status',
        minSize: 50,
        size: 50,
        maxSize: 70,
        enableSorting: false,
      }),
    ];
  }, []);
  return (
    <div className="p-5 dark:bg-bg-side-panel bg-white">
      <Table
        columns={columns}
        data={data.resources}
        size="compact"
        enablePagination
        pageSize={pageSize}
        pageIndex={data.currentPage}
        totalRows={data.totalRows}
        manualPagination
        enableColumnResizing
        onPaginationChange={(updaterOrValue) => {
          let newPageIndex = 0;
          if (typeof updaterOrValue === 'function') {
            newPageIndex = updaterOrValue({
              pageIndex: data.currentPage,
              pageSize: pageSize,
            }).pageIndex;
          } else {
            newPageIndex = updaterOrValue.pageIndex;
          }
          setPage(newPageIndex);
        }}
        enablePageResize
        onPageResize={(newSize) => {
          setPageSize(newSize);
        }}
        enableSorting
        manualSorting
        sortingState={sort}
        onSortingChange={setSort}
        noDataElement={<TableNoDataElement text="No resources" />}
      />
    </div>
  );
};
