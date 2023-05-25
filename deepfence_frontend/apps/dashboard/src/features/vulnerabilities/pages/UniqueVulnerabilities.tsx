import cx from 'classnames';
import { capitalize } from 'lodash-es';
import { Suspense, useMemo, useRef } from 'react';
import { IconContext } from 'react-icons';
import { FiFilter } from 'react-icons/fi';
import { HiChevronRight, HiExternalLink } from 'react-icons/hi';
import {
  Form,
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
  Checkbox,
  CircleSpinner,
  createColumnHelper,
  IconButton,
  Listbox,
  ListboxOption,
  Popover,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelVulnerability, SearchSearchNodeReq } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { apiWrapper } from '@/utils/api';
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

const getSeveritySearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('severity');
};
const getLiveConnectionSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('liveConnection');
};
async function getVulnerability(searchParams: URLSearchParams): Promise<{
  vulnerabilities: Array<ModelVulnerability>;
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const results: {
    vulnerabilities: Array<ModelVulnerability>;
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
  const severity = getSeveritySearch(searchParams);
  const liveConnection = getLiveConnectionSearch(searchParams);
  const searchVulnerabilitiesRequestParams: SearchSearchNodeReq = {
    node_filter: {
      filters: {
        contains_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
        match_filter: { filter_in: {} },
        compare_filter: null,
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

  if (severity.length) {
    searchVulnerabilitiesRequestParams.node_filter.filters.contains_filter.filter_in![
      'cve_severity'
    ] = severity;
  }
  if (liveConnection.length) {
    if (liveConnection.length === 1) {
      searchVulnerabilitiesRequestParams.node_filter.filters.contains_filter.filter_in![
        'has_live_connection'
      ] = [liveConnection[0] === 'active'];
    }
  }
  const searchVulnerabilitiesApi = apiWrapper({
    fn: getSearchApiClient().searchVulnerabilities,
  });
  const searchVulnerabilitiesResponse = await searchVulnerabilitiesApi({
    searchSearchNodeReq: searchVulnerabilitiesRequestParams,
  });
  if (!searchVulnerabilitiesResponse.ok) {
    throw searchVulnerabilitiesResponse.error;
  }

  const searchVulnerabilitiesCountApi = apiWrapper({
    fn: getSearchApiClient().searchVulnerabilitiesCount,
  });
  const searchVulnerabilitiesCountResponse = await searchVulnerabilitiesCountApi({
    searchSearchNodeReq: {
      ...searchVulnerabilitiesRequestParams,
      window: {
        ...searchVulnerabilitiesRequestParams.window,
        size: 10 * PAGE_SIZE,
      },
    },
  });
  if (!searchVulnerabilitiesCountResponse.ok) {
    throw searchVulnerabilitiesCountResponse.error;
  }

  results.vulnerabilities = searchVulnerabilitiesResponse.value;
  results.currentPage = page;
  results.totalRows = page * PAGE_SIZE + searchVulnerabilitiesCountResponse.value.count;

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
      columnHelper.accessor('cve_caused_by_package', {
        cell: (info) => info.getValue(),
        header: () => 'Package',
        minSize: 100,
        size: 200,
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
        cell: (info) => info.getValue(),
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
        cell: (info) => {
          if (!info.getValue().length) return null;
          return (
            <DFLink href={info.getValue()} target="_blank">
              <IconContext.Provider
                value={{
                  className: 'w-4 h-4',
                }}
              >
                <HiExternalLink />
              </IconContext.Provider>
            </DFLink>
          );
        },
        header: () => 'Exploit',
        minSize: 60,
        size: 60,
        maxSize: 70,
      }),
      columnHelper.accessor('resources', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => {
          return <TruncatedText text={info.getValue()?.join(', ') ?? ''} />;
        },
        header: () => 'Affected Resources',
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
  }, [searchParams]);

  const elementToFocusOnClose = useRef(null);

  const isFilterApplied =
    searchParams.has('severity') || searchParams.has('liveConnection');

  const onResetFilters = () => {
    setSearchParams(() => {
      return {};
    });
  };

  return (
    <div>
      <div className="flex p-2 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to={'/vulnerability'}>Vulnerabilities</DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Unique Vulnerabilities</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <span className="ml-2 max-h-5 flex items-center">
          {navigation.state === 'loading' ? <CircleSpinner size="xs" /> : null}
        </span>
        <div className="ml-auto flex gap-x-4">
          <div className="relative gap-x-4">
            {isFilterApplied && (
              <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            )}

            <Popover
              triggerAsChild
              elementToFocusOnCloseRef={elementToFocusOnClose}
              content={
                <div className="dark:text-white">
                  <FilterHeader onReset={onResetFilters} />
                  <Form className="flex flex-col gap-y-4 p-4">
                    <fieldset>
                      <legend className="text-sm font-medium">Severity</legend>
                      <Listbox
                        sizing="sm"
                        name="severity"
                        placeholder="Select Severity"
                        multiple={true}
                        value={searchParams.getAll('severity')}
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('severity');
                            value.forEach((v) => {
                              prev.append('severity', v.toLowerCase());
                            });
                            prev.delete('page');
                            return prev;
                          });
                        }}
                      >
                        {['critical', 'high', 'medium', 'low'].map((key) => {
                          return (
                            <ListboxOption key={key} value={key}>
                              {capitalize(key)}
                            </ListboxOption>
                          );
                        })}
                      </Listbox>
                    </fieldset>
                    <fieldset>
                      <legend className="text-sm font-medium">Live Connection</legend>
                      <div className="flex gap-x-4">
                        <Checkbox
                          label="Active"
                          checked={searchParams
                            .getAll('liveConnection')
                            .includes('active')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('liveConnection', 'active');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('liveConnection');
                                prev.delete('liveConnection');
                                prev.delete('page');
                                prevStatuses
                                  .filter((status) => status !== 'active')
                                  .forEach((status) => {
                                    prev.append('liveConnection', status);
                                  });
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="InActive"
                          checked={searchParams
                            .getAll('liveConnection')
                            .includes('inActive')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('liveConnection', 'inActive');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('liveConnection');
                                prev.delete('liveConnection');
                                prevStatuses
                                  .filter((status) => status !== 'inActive')
                                  .forEach((status) => {
                                    prev.append('liveConnection', status);
                                  });
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                      </div>
                    </fieldset>
                  </Form>
                </div>
              }
            >
              <IconButton
                className="ml-auto rounded-lg"
                size="xs"
                outline
                color="primary"
                ref={elementToFocusOnClose}
                icon={<FiFilter />}
              />
            </Popover>
          </div>
        </div>
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
                  approximatePagination
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
