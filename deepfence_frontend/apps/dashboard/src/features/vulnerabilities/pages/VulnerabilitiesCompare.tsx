import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  getRowSelectionColumn,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelScanCompareReqScanTypeEnum, ModelVulnerability } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { PopOutIcon } from '@/components/icons/common/PopOut';
import { CveCVSSScore, SeverityBadge } from '@/components/SeverityBadge';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { getPageFromSearchParams, useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 15;

const useGetScanDiff = () => {
  const [searchParams] = useSearchParams();
  const { firstScanId, secondScanId } = useParams() as {
    firstScanId: string;
    secondScanId: string;
  };

  return useSuspenseQuery({
    ...queries.vulnerability.scanDiff({
      firstScanId,
      secondScanId,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      scanType: ModelScanCompareReqScanTypeEnum.VulnerabilityScan,
    }),
    keepPreviousData: true,
  });
};

const CompareTable = () => {
  const { data } = useGetScanDiff();

  const [searchParams, setSearchParams] = useSearchParams();

  const columnHelper = createColumnHelper<ModelVulnerability>();
  const [sort, setSort] = useSortingState();

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 35,
        minSize: 35,
        maxSize: 35,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            ids={[cell.row.original.node_id]}
            setIdsToDelete={setIdsToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
            onTableAction={onTableAction}
            trigger={
              <button className="p-1">
                <div className="h-[16px] w-[16px] dark:text-text-text-and-icon rotate-90">
                  <EllipsisIcon />
                </div>
              </button>
            }
          />
        ),
        header: () => '',
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
      }),
      columnHelper.accessor('cve_id', {
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
              search: searchParams.toString(),
            }}
            className="flex items-center gap-x-[6px]"
          >
            <div className="w-4 h-4 shrink-0 dark:text-text-text-and-icon">
              <VulnerabilityIcon />
            </div>
            <div className="truncate">{info.getValue()}</div>
          </DFLink>
        ),
        header: () => 'CVE ID',
        minSize: 160,
        size: 160,
        maxSize: 160,
      }),
      columnHelper.accessor('cve_caused_by_package', {
        cell: (info) => info.getValue(),
        header: () => 'Package',
        minSize: 160,
        size: 160,
        maxSize: 160,
      }),
      columnHelper.accessor('cve_cvss_score', {
        cell: (info) => (
          <div>
            <CveCVSSScore score={info.getValue()} />
          </div>
        ),
        header: () => <TruncatedText text="CVSS Score" />,
        minSize: 50,
        size: 60,
        maxSize: 60,
      }),
      columnHelper.accessor('cve_severity', {
        cell: (info) => (
          <div>
            <SeverityBadge severity={info.getValue()} />
          </div>
        ),
        header: () => 'Severity',
        minSize: 70,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('cve_description', {
        enableSorting: false,
        cell: (info) => {
          return <TruncatedText text={info.getValue() || 'No description available'} />;
        },
        header: () => 'Description',
        minSize: 220,
        size: 220,
        maxSize: 230,
      }),
      columnHelper.accessor('cve_link', {
        enableSorting: false,
        cell: (info) => {
          if (!info.getValue().length) return '-';
          return (
            <DFLink to={info.getValue()} target="_blank" rel="noopener noreferrer">
              <div className="h-[16px] w-[16px]">
                <PopOutIcon />
              </div>
            </DFLink>
          );
        },
        header: () => 'Link',
        minSize: 40,
        size: 40,
        maxSize: 45,
        enableResizing: false,
      }),
    ];

    return columns;
  }, [setSearchParams]);
  return (
    <Table
      size="default"
      data={data?.tableData}
      columns={columns}
      enablePagination
      manualPagination
      enableColumnResizing
      approximatePagination
      totalRows={data?.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={data?.currentPage}
      getRowId={(row) => row.node_id}
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
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: data?.currentPage ?? 0,
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
      getTrProps={(row) => {
        if (row.original.masked) {
          return {
            className: 'opacity-40',
          };
        }
        return {};
      }}
      enablePageResize
      onPageResize={(newSize) => {
        setSearchParams((prev) => {
          prev.set('size', String(newSize));
          prev.delete('page');
          return prev;
        });
      }}
      noDataElement={<TableNoDataElement text="No data available" />}
    />
  );
};

const VulnerabilitiesCompare = () => {
  return (
    <Suspense fallback={<TableSkeleton columns={7} rows={DEFAULT_PAGE_SIZE} />}>
      <CompareTable />
    </Suspense>
  );
};

export const module = {
  element: <VulnerabilitiesCompare />,
};
