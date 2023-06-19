import { toNumber } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import {
  LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router-dom';
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

import { getSearchApiClient } from '@/api/api';
import { ModelScanInfo, SearchSearchScanReq } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { VulnerabilityIcon } from '@/components/icons/vulnerability';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { SbomModal } from '@/features/vulnerabilities/api/sbomApiLoader';
import { apiWrapper } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

const PAGE_SIZE = 10;

async function getScans(searchParams: URLSearchParams): Promise<{
  scans: ModelScanInfo[];
  currentPage: number;
  totalRows: number;
}> {
  let page = toNumber(searchParams.get('page') ?? '0');
  page = isFinite(page) && !isNaN(page) && page > 0 ? page : 0;
  const requestFilters: SearchSearchScanReq = {
    node_filters: {
      filters: {
        contains_filter: {
          filter_in: {},
        },
        match_filter: { filter_in: {} },
        order_filter: {
          order_fields: [],
        },
        compare_filter: null,
      },
      in_field_filter: null,
      window: {
        offset: 0,
        size: 0,
      },
    },
    scan_filters: {
      filters: {
        contains_filter: {
          filter_in: {
            status: ['COMPLETE'],
          },
        },
        match_filter: {
          filter_in: {},
        },
        order_filter: {
          order_fields: [
            {
              field_name: 'updated_at',
              descending: true,
            },
          ],
        },
        compare_filter: null,
      },
      in_field_filter: null,
      window: {
        offset: 0,
        size: 0,
      },
    },
    window: {
      offset: page * PAGE_SIZE,
      size: PAGE_SIZE,
    },
  };
  const order = getOrderFromSearchParams(searchParams);
  if (order) {
    requestFilters.node_filters.filters.order_filter.order_fields = [
      {
        field_name: order.sortBy,
        descending: order.descending,
      },
    ];
  }
  const searchVulnerabilityScanApi = apiWrapper({
    fn: getSearchApiClient().searchVulnerabilityScan,
  });
  const searchVulnerabilityScanResponse = await searchVulnerabilityScanApi({
    searchSearchScanReq: requestFilters,
  });
  if (!searchVulnerabilityScanResponse.ok) {
    throw new Error('unknown response');
  }

  const searchVulnerabilityScanCountApi = apiWrapper({
    fn: getSearchApiClient().searchVulnerabilityScanCount,
  });
  const searchVulnerabilityScanCountResponse = await searchVulnerabilityScanCountApi({
    searchSearchScanReq: {
      ...requestFilters,
      window: {
        ...requestFilters.window,
        size: 10 * requestFilters.window.size,
      },
    },
  });
  if (!searchVulnerabilityScanCountResponse.ok) {
    throw searchVulnerabilityScanCountResponse.error;
  }

  return {
    scans: searchVulnerabilityScanResponse.value,
    currentPage: page,
    totalRows: page * PAGE_SIZE + searchVulnerabilityScanCountResponse.value.count,
  };
}

type LoaderData = {
  scans: Awaited<ReturnType<typeof getScans>>;
};

const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderData>> => {
  const searchParams = new URL(request.url).searchParams;
  return typedDefer({
    scans: getScans(searchParams),
  });
};

const RuntimeBom = () => {
  const loaderData = useLoaderData() as LoaderData;
  const [_, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const [selectedNode, setSelectedNode] = useState<{
    nodeName: string;
    scanId: string;
  } | null>(null);
  const [sort, setSort] = useSortingState();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<LoaderData['scans']['scans'][number]>();
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
      {/* do we need shadow here? */}
      <div className="flex pl-6 px-2 py-2.5 items-center w-full shadow bg-white dark:bg-bg-breadcrumb-bar">
        <Breadcrumb>
          <BreadcrumbLink
            icon={
              <div className="mr-2">
                <VulnerabilityIcon />
              </div>
            }
          >
            <DFLink to={'/vulnerability'} unstyled>
              Vulnerabilities
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Runtime BOM</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <span className="ml-2 flex items-center">
          {navigation.state === 'loading' ? <CircleSpinner size="sm" /> : null}
        </span>
      </div>
      <div className="m-2">
        <Suspense fallback={<TableSkeleton columns={2} rows={10} size={'compact'} />}>
          <DFAwait resolve={loaderData.scans}>
            {(resolvedData: LoaderData['scans']) => {
              return (
                <Table
                  size="default"
                  data={resolvedData.scans}
                  columns={columns}
                  enablePagination
                  manualPagination
                  enableColumnResizing
                  totalRows={resolvedData.totalRows}
                  pageSize={PAGE_SIZE}
                  pageIndex={resolvedData.currentPage}
                  onPaginationChange={(updaterOrValue) => {
                    let newPageIndex = 0;
                    if (typeof updaterOrValue === 'function') {
                      newPageIndex = updaterOrValue({
                        pageIndex: resolvedData.currentPage,
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
              );
            }}
          </DFAwait>
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
  loader,
  element: <RuntimeBom />,
};
