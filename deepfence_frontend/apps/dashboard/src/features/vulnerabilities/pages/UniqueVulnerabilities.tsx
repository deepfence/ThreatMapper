import cx from 'classnames';
import { groupBy, toNumber } from 'lodash-es';
import { Suspense, useMemo } from 'react';
import { IconContext } from 'react-icons';
import { HiArrowSmLeft, HiExternalLink } from 'react-icons/hi';
import {
  Await,
  LoaderFunctionArgs,
  Outlet,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  CircleSpinner,
  createColumnHelper,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient, getSearchApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  GetAllNodesInScanResultScanTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';

type CveType = {
  cveId: string;
  cveDescription: string;
  cveLink: string;
  cveType: string;
  cveSeverity: string;
  cveCVSSScore: number;
  cveAttackVector: string;
  cveAssetAffected: string;
  active: boolean;
  exploitPoc: string;
};

type LoaderDataType = {
  error?: string;
  message?: string;
  data: Awaited<ReturnType<typeof getVulnerability>>;
};
function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = toNumber(searchParams.get('page') ?? '0');
  return isFinite(page) && !isNaN(page) && page > 0 ? page : 0;
}

const PAGE_SIZE = 15;

async function getVulnerability(searchParams: URLSearchParams): Promise<{
  vulnerabilities: CveType[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const results: {
    vulnerabilities: CveType[];
    currentPage: number;
    totalRows: number;
    message?: string;
  } = {
    currentPage: 1,
    totalRows: 0,
    vulnerabilities: [],
  };

  const page = getPageFromSearchParams(searchParams);

  let offsetSize = page * PAGE_SIZE;
  if (offsetSize > 1000) {
    offsetSize = (page - 1) * PAGE_SIZE;
  }

  const result = await makeRequest({
    apiFunction: getSearchApiClient().searchVulnerabilities,
    apiArgs: [
      {
        searchSearchNodeReq: {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {},
              },
              order_filter: {
                order_fields: [],
              },
              match_filter: {
                filter_in: {},
              },
            },
            in_field_filter: null,
          },
          window: {
            offset: offsetSize,
            size: PAGE_SIZE,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError(results);
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          ...results,
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  const countsResult = await makeRequest({
    apiFunction: getSearchApiClient().searchVulnerabilityCount,
    apiArgs: [
      {
        searchSearchNodeReq: {
          node_filter: {
            filters: {
              contains_filter: {
                filter_in: {
                  exploitability_score: [1, 2, 3],
                },
              },
              order_filter: {
                order_fields: [
                  'exploitability_score',
                  'cve_severity',
                  'vulnerability_score',
                ],
              },
              match_filter: {
                filter_in: {},
              },
            },
            in_field_filter: null,
          },
          window: {
            offset: 0,
            size: 1000,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError(results);
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          ...results,
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(countsResult)) {
    throw countsResult.value();
  }
  debugger;
  const allNodes = await makeRequest({
    apiFunction: getScanResultsApiClient().getAllNodesInScanResults,
    apiArgs: [
      {
        resultId: result.map((res) => res.cve_id),
        scanType: GetAllNodesInScanResultScanTypeEnum.VulnerabilityScan,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError(results);
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          ...results,
          message: modelResponse.message,
        });
      }
    },
  });

  if (result === null) {
    return results;
  }
  debugger;
  const groupByNodes = groupBy(allNodes, 'name');
  console.log(groupByNodes);
  results.vulnerabilities = result
    .map((res) => {
      return {
        cveId: res.cve_id,
        cveDescription: res.cve_description,
        cveLink: res.cve_link,
        cveType: res.cve_type,
        cveSeverity: res.cve_severity,
        cveCVSSScore: res.cve_cvss_score,
        cveAttackVector: res.parsed_attack_vector,
        // cveAssetAffected: groupByNodes[res.cve_id][0].,
        active: res.has_live_connection,
        exploitPoc: res.exploit_poc,
      };
    })
    .sort((a, b) => b.cveCVSSScore - a.cveCVSSScore);

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
  const columnHelper = createColumnHelper<CveType>();
  const loaderData = useLoaderData() as LoaderDataType;
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('cveId', {
        enableSorting: false,
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
                <div className="w-5 h-5">
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
      columnHelper.accessor('cveSeverity', {
        enableSorting: false,
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
      columnHelper.accessor('cveCVSSScore', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => info.getValue(),
        header: () => 'Score',
        minSize: 70,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('cveAttackVector', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => info.getValue(),
        header: () => 'Attack Vector',
        minSize: 100,
        size: 120,
        maxSize: 250,
      }),
      columnHelper.accessor('active', {
        enableSorting: false,
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
      columnHelper.accessor('exploitPoc', {
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
      columnHelper.accessor('cveAssetAffected', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => info.getValue(),
        header: () => 'Asset Type',
        minSize: 200,
        size: 200,
        maxSize: 240,
      }),
      columnHelper.accessor('cveDescription', {
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
        <DFLink
          to={'/vulnerability'}
          className="flex hover:no-underline items-center justify-center  mr-2"
        >
          <IconContext.Provider
            value={{
              className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
            }}
          >
            <HiArrowSmLeft />
          </IconContext.Provider>
        </DFLink>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          MOST EXPLOITABLE VULNERABILITIES
        </span>
        <span className="ml-2">
          {navigation.state === 'loading' ? <CircleSpinner size="xs" /> : null}
        </span>
      </div>
      <div className="m-2">
        <Suspense fallback={<TableSkeleton columns={9} rows={10} size={'md'} />}>
          <Await resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              return (
                <Table
                  size="sm"
                  data={resolvedData.vulnerabilities ?? []}
                  columns={columns}
                  enablePagination
                  manualPagination
                  enableRowSelection
                  enableSorting
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
                />
              );
            }}
          </Await>
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
