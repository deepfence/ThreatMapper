import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { capitalize } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiExternalLink } from 'react-icons/hi';
import { Outlet, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { ModelVulnerability } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { CveCVSSScore, SeverityBadge } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { TruncatedText } from '@/components/TruncatedText';
import { queries } from '@/queries';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

const FILTER_SEARCHPARAMS: Record<string, string> = {
  liveConnection: 'Live Connection',
  severity: 'CVE Severity',
};
const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [severity, setSeverity] = useState('');
  const [liveConnection, setLiveConnection] = useState('');

  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  return (
    <div className="px-4 py-2.5 mb-4 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['severity']}
          multiple
          value={searchParams.getAll('severity')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('severity');
              values.forEach((value) => {
                prev.append('severity', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setSeverity(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('severity');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['critical', 'high', 'medium', 'low', 'unknown']
            .filter((item) => {
              if (!severity.length) return true;
              return item.includes(severity.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['liveConnection']}
          multiple
          value={searchParams.getAll('liveConnection')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('liveConnection');
              values.forEach((value) => {
                prev.append('liveConnection', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setLiveConnection(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('liveConnection');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['active', 'in active']
            .filter((item) => {
              if (!liveConnection.length) return true;
              return item.includes(liveConnection.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {Array.from(searchParams)
            .filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            })
            .map(([key, value]) => {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  onRemove={() => {
                    setSearchParams((prev) => {
                      const existingValues = prev.getAll(key);
                      prev.delete(key);
                      existingValues.forEach((existingValue) => {
                        if (existingValue !== value) prev.append(key, existingValue);
                      });
                      prev.delete('page');
                      return prev;
                    });
                  }}
                  text={`${FILTER_SEARCHPARAMS[key]}: ${value}`}
                />
              );
            })}
          <Button
            variant="flat"
            color="default"
            startIcon={<TimesIcon />}
            onClick={() => {
              setSearchParams((prev) => {
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.delete('page');
                return prev;
              });
            }}
            size="sm"
          >
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
};
const UniqueTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelVulnerability>();
  const [sort, setSort] = useSortingState();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('cve_id', {
        enableResizing: true,
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${info.getValue()}`,
              search: `?${searchParams.toString()}`,
            }}
            className="flex items-center gap-x-2"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-500/10 rounded-lg shrink-0">
              <div className="w-3 h-3 dark:text-status-error">
                <SecretsIcon />
              </div>
            </div>
            <TruncatedText text={info.getValue() ?? ''} />
          </DFLink>
        ),
        header: () => <TruncatedText text="CVE ID" />,
        minSize: 100,
        size: 150,
        maxSize: 250,
      }),
      columnHelper.accessor('cve_caused_by_package', {
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Package" />,
        minSize: 100,
        size: 120,
        maxSize: 125,
      }),
      columnHelper.accessor('cve_severity', {
        enableResizing: true,
        cell: (info) => <SeverityBadge severity={info.getValue()} />,
        header: () => <TruncatedText text="Severity" />,
        minSize: 80,
        size: 80,
        maxSize: 100,
      }),
      columnHelper.accessor('cve_cvss_score', {
        enableResizing: true,
        cell: (info) => <CveCVSSScore score={info.getValue()} />,
        header: () => <TruncatedText text="Score" />,
        minSize: 70,
        size: 60,
        maxSize: 85,
      }),
      columnHelper.accessor('cve_attack_vector', {
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Attack Vector" />,
        minSize: 100,
        size: 120,
        maxSize: 250,
      }),
      columnHelper.accessor('has_live_connection', {
        enableResizing: true,
        cell: (info) => <div>{info.getValue() === true ? 'Active' : 'In Active'}</div>,
        header: () => <TruncatedText text="Live" />,
        minSize: 60,
        size: 70,
        maxSize: 70,
      }),
      columnHelper.accessor('exploit_poc', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => {
          if (!info.getValue().length) return '-';
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
        header: () => <TruncatedText text="Exploit" />,
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
        header: () => <TruncatedText text="Affected Resources" />,
        minSize: 180,
        size: 180,
        maxSize: 190,
      }),
      columnHelper.accessor('cve_description', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Description" />,
        minSize: 200,
        size: 200,
        maxSize: 210,
      }),
    ];

    return columns;
  }, [searchParams]);

  const { data } = useSuspenseQuery({
    ...queries.secret.uniqueSecrets({
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      liveConnection: searchParams.getAll('liveConnection'),
      page: parseInt(searchParams.get('page') ?? '0', 10),
      order: getOrderFromSearchParams(searchParams),
      severity: searchParams.getAll('severity'),
    }),
    keepPreviousData: true,
  });

  return (
    <Table
      data={data.vulnerabilities ?? []}
      columns={columns}
      enablePagination
      manualPagination
      enableRowSelection
      enableColumnResizing
      approximatePagination
      totalRows={data.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={data.currentPage}
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: data.currentPage,
            pageSize: DEFAULT_PAGE_SIZE,
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
      enablePageResize
      onPageResize={(newSize) => {
        setSearchParams((prev) => {
          prev.set('size', String(newSize));
          prev.delete('page');
          return prev;
        });
      }}
    />
  );
};

const UniqueSecrets = () => {
  const isFetching = useIsFetching({
    queryKey: queries.secret.uniqueSecrets._def,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchParams] = useSearchParams();

  return (
    <div>
      <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<SecretsIcon />} isLink>
            <DFLink to={'/secret'} unstyled>
              Secrets
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Unique Secrets</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <div className="ml-2 flex items-center">
          {isFetching ? <CircleSpinner size="sm" /> : null}
        </div>
      </div>
      <div className="mx-4 pb-4">
        <Button
          variant="flat"
          className="ml-auto py-2"
          startIcon={<FilterIcon />}
          endIcon={
            getAppliedFiltersCount(searchParams) > 0 ? (
              <Badge
                label={String(getAppliedFiltersCount(searchParams))}
                variant="filled"
                size="small"
                color="blue"
              />
            ) : null
          }
          size="sm"
          onClick={() => {
            setFiltersExpanded((prev) => !prev);
          }}
        >
          Filter
        </Button>
        {filtersExpanded ? <Filters /> : null}
        <Suspense fallback={<TableSkeleton columns={9} rows={10} />}>
          <UniqueTable />
        </Suspense>
      </div>
      <Outlet />
    </div>
  );
};

export const module = {
  element: <UniqueSecrets />,
};
