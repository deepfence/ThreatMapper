import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Card,
  CircleSpinner,
  createColumnHelper,
  getRowSelectionColumn,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelVulnerability } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { PopOutIcon } from '@/components/icons/common/PopOut';
import { TaskIcon } from '@/components/icons/common/Task';
import { CveCVSSScore, SeverityBadge } from '@/components/SeverityBadge';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { formatMilliseconds } from '@/utils/date';
import { abbreviateNumber } from '@/utils/number';
import { useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 15;

const useGetScanDiff = () => {
  const { nodeId, nodeType, firstScanTime, secondScanTime } = useParams() as {
    firstScanTime: string;
    secondScanTime: string;
    nodeId: string;
    nodeType: string;
  };

  return useSuspenseQuery({
    ...queries.vulnerability.scanDiff({
      firstScanTime,
      secondScanTime,
      nodeId,
      nodeType,
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
    <div className="mt-4">
      <Table
        size="default"
        data={data?.added}
        columns={columns}
        enablePagination
        enableColumnResizing
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
    </div>
  );
};

const CompareCountWidget = () => {
  const { data } = useGetScanDiff();

  return (
    <div className="grid grid-cols-12 px-6 items-center">
      <div className="col-span-2 dark:text-text-text-and-icon">
        <span className="text-p1">Total difference</span>
        <div className="flex flex-1 max-w-[160px] gap-1 items-center dark:text-text-input-value">
          <>
            <TaskIcon />
            <span className="text-h1 dark:text-text-input pl-1.5">
              {abbreviateNumber(20)}
            </span>
          </>
        </div>
      </div>
      <div className="w-px h-[60%] dark:bg-bg-grid-border" />
      <div className="col-span-2 dark:text-text-text-and-icon">
        <span className="text-p1">Total added vulnerabilities</span>
        <div className="flex flex-1 max-w-[160px] gap-1 items-center dark:text-text-input-value">
          <>
            <div className="h-4 w-4 rounded-full bg-status-success"></div>
            <span className="text-h1 dark:text-text-input pl-1.5">
              {abbreviateNumber(10)}
            </span>
          </>
        </div>
      </div>
      <div className="col-span-2 dark:text-text-text-and-icon">
        <span className="text-p1">Total deleted vulnerabilities</span>
        <div className="flex flex-1 max-w-[160px] gap-1 items-center dark:text-text-input-value">
          <>
            <div className="h-4 w-4 rounded-full bg-status-error"></div>
            <span className="text-h1 dark:text-text-input pl-1.5">
              {abbreviateNumber(10)}
            </span>
          </>
        </div>
      </div>
    </div>
  );
};

const CountWidget = () => {
  return (
    <Card className="max-h-[130px] px-4 py-2.5 flex items-center">
      <div className="flex-1 pl-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[120px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <CompareCountWidget />
        </Suspense>
      </div>
    </Card>
  );
};

const ScanComapareTime = () => {
  const { firstScanTime, secondScanTime } = useParams() as {
    firstScanTime: string;
    secondScanTime: string;
  };

  return (
    <div className="flex items-center h-12">
      <div className="dark:text-text-text-and-icon text-p4 flex gap-x-1">
        Comparision between{' '}
        <span className="dark:text-text-input-value text-p4">
          {formatMilliseconds(firstScanTime)}
        </span>{' '}
        with{' '}
        <span className="dark:text-text-input-value text-p4">
          {formatMilliseconds(secondScanTime)}
        </span>{' '}
        scans
      </div>
    </div>
  );
};

const Header = () => {
  return (
    <div className="flex pl-4 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<VulnerabilityIcon />} isLink>
            <DFLink to={'/vulnerability'} unstyled>
              Vulnerabilities
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink isLast>
            <span className="inherit cursor-auto">Compare</span>
          </BreadcrumbLink>
        </Breadcrumb>
      </>
    </div>
  );
};

const VulnerabilitiesCompare = () => {
  return (
    <>
      <Header />
      <div className="mx-4">
        <ScanComapareTime />
        <CountWidget />
        <Suspense fallback={<TableSkeleton columns={7} rows={DEFAULT_PAGE_SIZE} />}>
          <CompareTable />
        </Suspense>
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  element: <VulnerabilitiesCompare />,
};
