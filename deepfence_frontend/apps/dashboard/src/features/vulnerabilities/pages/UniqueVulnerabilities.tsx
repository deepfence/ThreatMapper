import cx from 'classnames';
import { capitalize } from 'lodash-es';
import { Suspense, useMemo } from 'react';
import { IconContext } from 'react-icons';
import { HiChevronRight, HiExternalLink } from 'react-icons/hi';
import {
  LoaderFunctionArgs,
  Outlet,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  CircleSpinner,
  createColumnHelper,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient, getSearchApiClient } from '@/api/api';
import {
  ModelNodesInScanResultRequestScanTypeEnum,
  ModelScanResultBasicNode,
  ModelVulnerability,
  SearchSearchNodeReq,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';

type LoaderDataType = {
  error?: string;
  message?: string;
  data: Awaited<ReturnType<typeof getVulnerability>>;
};
const PAGE_SIZE = 15;

async function getVulnerability(searchParams: URLSearchParams): Promise<{
  vulnerabilities: Array<ModelVulnerability & { cve_affected_assets: string }>;
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const results: {
    vulnerabilities: Array<ModelVulnerability & { cve_affected_assets: string }>;
    currentPage: number;
    totalRows: number;
    message?: string;
  } = {
    currentPage: 1,
    totalRows: 0,
    vulnerabilities: [],
  };

  const page = getPageFromSearchParams(searchParams);
  const order = getOrderFromSearchParams(searchParams);

  const searchVulnerabilitiesRequestParams: SearchSearchNodeReq = {
    node_filter: {
      filters: {
        contains_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
        match_filter: { filter_in: {} },
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
    searchVulnerabilitiesRequestParams.node_filter.filters.order_filter.order_fields?.push(
      {
        field_name: order.sortBy,
        descending: order.descending,
      },
    );
  }

  const result = await makeRequest({
    apiFunction: getSearchApiClient().searchVulnerabilities,
    apiArgs: [{ searchSearchNodeReq: searchVulnerabilitiesRequestParams }],
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  const countsResult = await makeRequest({
    apiFunction: getSearchApiClient().searchVulnerabilitiesCount,
    apiArgs: [
      {
        searchSearchNodeReq: {
          ...searchVulnerabilitiesRequestParams,
          window: {
            ...searchVulnerabilitiesRequestParams.window,
            size: 10 * PAGE_SIZE,
          },
        },
      },
    ],
  });

  if (ApiError.isApiError(countsResult)) {
    throw countsResult.value();
  }

  const allNodes = await makeRequest({
    apiFunction: getScanResultsApiClient().getAllNodesInScanResults,
    apiArgs: [
      {
        modelNodesInScanResultRequest: {
          result_ids: result.map((res) => res.cve_id),
          scan_type: ModelNodesInScanResultRequestScanTypeEnum.VulnerabilityScan,
        },
      },
    ],
  });

  if (ApiError.isApiError(allNodes)) {
    throw allNodes.value();
  }

  if (result === null) {
    // TODO: handle this with 404?
    throw new Error('unable to get cve results');
  }

  const groupByNodes = allNodes.reduce<{ [k: string]: ModelScanResultBasicNode }>(
    (acc, data) => {
      const { result_id, ...rest } = data;
      acc[result_id] = rest as ModelScanResultBasicNode;
      return acc;
    },
    {},
  );

  results.vulnerabilities = result.map((vulnerability) => {
    const resources = groupByNodes[vulnerability.cve_id];
    const resourcesLen = resources?.basic_nodes?.length ?? 0;
    let affectedAssets = resources?.basic_nodes?.[0]?.name ?? '';
    if (affectedAssets && resourcesLen > 1) {
      affectedAssets = `${affectedAssets} + ${resourcesLen - 1} more`;
    }
    return {
      ...vulnerability,
      cve_affected_assets: affectedAssets,
    };
  });

  results.currentPage = page;
  results.totalRows = page * PAGE_SIZE + countsResult.count;

  return results;
}
const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const searchParams = new URL(request.url).searchParams;

  return typedDefer({
    data: getVulnerability(searchParams),
  });
};

const UniqueVulnerabilities = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const columnHelper =
    createColumnHelper<LoaderDataType['data']['vulnerabilities'][number]>();
  const loaderData = useLoaderData() as LoaderDataType;
  const [sort, setSort] = useSortingState();

  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('cve_id', {
        enableResizing: true,
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${info.getValue()}`,
              search: searchParams.toString(),
            }}
            className="flex items-center gap-x-2"
          >
            <>
              <div className="p-2 bg-gray-100 dark:bg-gray-500/10 rounded-lg">
                <div className="w-4 h-4">
                  <VulnerabilityIcon />
                </div>
              </div>
              {info.getValue()}
            </>
          </DFLink>
        ),
        header: () => 'CVE ID',
        minSize: 100,
        size: 150,
        maxSize: 250,
      }),
      columnHelper.accessor('cve_severity', {
        enableResizing: false,
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase()}
            className={cx({
              'bg-[#de425b]/20 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                info.getValue().toLowerCase() === 'critical',
              'bg-[#f58055]/20 dark:bg-[#f58055/20 text-[#f58055] dark:text-[#f58055]':
                info.getValue().toLowerCase() === 'high',
              'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                info.getValue().toLowerCase() === 'medium',
              'bg-[#d6e184]/20 dark:bg-[#d6e184]/10 text-yellow-300 dark:text-[#d6e184]':
                info.getValue().toLowerCase() === 'low',
              'bg-[#9CA3AF]/10 dark:bg-[#9CA3AF]/10 text-gray-400 dark:text-[#9CA3AF]':
                info.getValue().toLowerCase() === 'unknown',
            })}
            size="sm"
          />
        ),
        header: () => 'Severity',
        minSize: 70,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('cve_cvss_score', {
        enableResizing: false,
        cell: (info) => info.getValue(),
        header: () => 'Score',
        minSize: 70,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('cve_attack_vector', {
        enableResizing: false,
        cell: (info) => capitalize(info.getValue()),
        header: () => 'Attack Vector',
        minSize: 100,
        size: 120,
        maxSize: 250,
      }),
      columnHelper.accessor('has_live_connection', {
        enableResizing: false,
        cell: (info) => (
          <div
            className={cx('h-2.5 w-2.5 rounded-full', {
              'bg-green-400 text:bg-green-500': info.getValue() === true,
              'bg-gray-400 text:bg-gray-500': info.getValue() === false,
            })}
          ></div>
        ),
        header: () => 'Live',
        minSize: 40,
        size: 60,
        maxSize: 50,
      }),
      columnHelper.accessor('exploit_poc', {
        enableSorting: false,
        enableResizing: false,
        cell: () => (
          <DFLink to="#">
            <IconContext.Provider
              value={{
                className: 'w-4 h-4',
              }}
            >
              <HiExternalLink />
            </IconContext.Provider>
          </DFLink>
        ),
        header: () => 'Exploit',
        minSize: 60,
        size: 60,
        maxSize: 70,
      }),
      columnHelper.accessor('cve_affected_assets', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => info.getValue(),
        header: () => 'Vulnerable Resources',
        minSize: 200,
        size: 200,
        maxSize: 240,
      }),
      columnHelper.accessor('cve_description', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => info.getValue(),
        header: () => 'Description',
        minSize: 200,
        size: 250,
        maxSize: 400,
      }),
    ];

    return columns;
  }, []);

  return (
    <div>
      <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to={'/vulnerability'}>VULNERABILITIES</DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">UNIQUE VULNERABILITIES</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <span className="ml-2 max-h-5 flex items-center">
          {navigation.state === 'loading' ? <CircleSpinner size="xs" /> : null}
        </span>
      </div>
      <div className="m-2">
        <Suspense fallback={<TableSkeleton columns={9} rows={10} size={'md'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              return (
                <Table
                  size="sm"
                  data={resolvedData.vulnerabilities ?? []}
                  columns={columns}
                  enablePagination
                  manualPagination
                  enableRowSelection
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
      <Outlet />
    </div>
  );
};

export const module = {
  loader,
  element: <UniqueVulnerabilities />,
};
