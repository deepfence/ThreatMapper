import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { Suspense, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { useNavigation, useSearchParams } from 'react-router-dom';
import { cn } from 'tailwind-preset';
import {
  Breadcrumb,
  BreadcrumbLink,
  CircleSpinner,
  createColumnHelper,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { SbomModal } from '@/features/vulnerabilities/api/sbomApiLoader';
import { queries } from '@/queries';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

const PAGE_SIZE = 10;

const RuntimeBom = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useSuspenseQuery({
    ...queries.vulnerability.scanList({
      pageSize: PAGE_SIZE,
      clusters: searchParams.getAll('clusters'),
      containers: searchParams.getAll('containers'),
      hosts: searchParams.getAll('hosts'),
      images: searchParams.getAll('containerImages'),
      languages: searchParams.getAll('languages'),
      page: parseInt(searchParams.get('page') ?? '0', 10),
      order: getOrderFromSearchParams(searchParams),
      status: ['COMPLETE'],
    }),
    keepPreviousData: true,
  });
  const isFetching = useIsFetching({
    queryKey: queries.vulnerability.scanList._def,
  });
  const navigation = useNavigation();
  const [selectedNode, setSelectedNode] = useState<{
    nodeName: string;
    scanId: string;
  } | null>(null);
  const [sort, setSort] = useSortingState();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<NonNullable<typeof data>['scans'][number]>();
    const columns = [
      columnHelper.accessor('node_type', {
        enableSorting: true,
        sortDescFirst: false,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2.5">
              <IconContext.Provider value={{ className: 'w-4 h-4 ' }}>
                {IconMapForNodeType[info.getValue()]}
              </IconContext.Provider>
              <span className={cn('flex-1 truncate capitalize')}>
                {info.getValue()?.replaceAll('_', ' ')}
              </span>
            </div>
          );
        },
        header: () => 'Type',
        minSize: 50,
        size: 100,
        maxSize: 200,
      }),
      columnHelper.accessor('node_name', {
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2 truncate">
              <DFLink
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedNode({
                    scanId: info.row.original.scan_id,
                    nodeName: info.row.original.node_id,
                  });
                }}
                href="#"
              >
                <span className="truncate">{info.getValue()}</span>
              </DFLink>
            </div>
          );
        },
        header: () => 'Node',
        minSize: 200,
        size: 300,
        maxSize: 500,
      }),
    ];

    return columns;
  }, []);

  return (
    <div>
      <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<VulnerabilityIcon />} isLink>
            <DFLink to={'/vulnerability'} unstyled>
              Vulnerabilities
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Runtime BOM</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <span className="ml-2 flex items-center">
          {isFetching ? <CircleSpinner size="sm" /> : null}
        </span>
      </div>
      <div className="m-4">
        <Suspense fallback={<TableSkeleton columns={2} rows={10} />}>
          <Table
            data={data.scans}
            columns={columns}
            enablePagination
            manualPagination
            enableColumnResizing
            totalRows={data.totalRows}
            pageSize={PAGE_SIZE}
            pageIndex={data.currentPage}
            onPaginationChange={(updaterOrValue) => {
              let newPageIndex = 0;
              if (typeof updaterOrValue === 'function') {
                newPageIndex = updaterOrValue({
                  pageIndex: data.currentPage,
                  pageSize: PAGE_SIZE,
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
          />
        </Suspense>
      </div>
      {selectedNode ? (
        <SbomModal
          scanId={selectedNode.scanId}
          nodeName={selectedNode.nodeName}
          onClose={() => {
            setSelectedNode(null);
          }}
        />
      ) : null}
    </div>
  );
};

export const module = {
  element: <RuntimeBom />,
};
