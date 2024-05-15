import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { capitalize, upperFirst } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
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
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { FilterIcon } from '@/components/icons/common/Filter';
import { PopOutIcon } from '@/components/icons/common/PopOut';
import { TimesIcon } from '@/components/icons/common/Times';
import { SeverityBadgeIcon } from '@/components/SeverityBadge';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum, VulnerabilitySeverityType } from '@/types/common';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

enum FILTER_SEARCHPARAMS_KEYS_ENUM {
  liveConnection = 'liveConnection',
  severity = 'severity',
  hosts = 'hosts',
  containers = 'containers',
  containerImages = 'containerImages',
  clusters = 'clusters',
}

const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [
  FILTER_SEARCHPARAMS_KEYS_ENUM.hosts,
  FILTER_SEARCHPARAMS_KEYS_ENUM.containerImages,
  FILTER_SEARCHPARAMS_KEYS_ENUM.clusters,
  FILTER_SEARCHPARAMS_KEYS_ENUM.containers,
];

const FILTER_SEARCHPARAMS: Record<FILTER_SEARCHPARAMS_KEYS_ENUM, string> = {
  liveConnection: 'Live Connection',
  severity: 'CVE Severity',
  hosts: 'Host',
  containers: 'Container',
  containerImages: 'Container Images',
  clusters: 'Clusters',
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

  const onFilterRemove = ({ key, value }: { key: string; value: string }) => {
    return () => {
      setSearchParams((prev) => {
        const existingValues = prev.getAll(key);
        prev.delete(key);
        existingValues.forEach((existingValue) => {
          if (existingValue !== value) prev.append(key, existingValue);
        });
        prev.delete('page');
        return prev;
      });
    };
  };

  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  return (
    <FilterWrapper>
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
        <SearchableHostList
          scanType={ScanTypeEnum.VulnerabilityScan}
          defaultSelectedHosts={searchParams.getAll('hosts')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('hosts');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('hosts');
              value.forEach((host) => {
                prev.append('hosts', host);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableContainerList
          scanType={ScanTypeEnum.VulnerabilityScan}
          defaultSelectedContainers={searchParams.getAll('containers')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('containers');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('containers');
              value.forEach((container) => {
                prev.append('containers', container);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableImageList
          scanType={ScanTypeEnum.VulnerabilityScan}
          defaultSelectedImages={searchParams.getAll('containerImages')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('containerImages');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('containerImages');
              value.forEach((containerImage) => {
                prev.append('containerImages', containerImage);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableClusterList
          defaultSelectedClusters={searchParams.getAll('clusters')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('clusters');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('clusters');
              value.forEach((cluster) => {
                prev.append('clusters', cluster);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
      </div>
      {appliedFilterCount > 0 ? (
        <div className="flex gap-2.5 mt-4 flex-wrap items-center">
          {(
            Array.from(searchParams).filter(([key]) => {
              return Object.keys(FILTER_SEARCHPARAMS).includes(key);
            }) as Array<[FILTER_SEARCHPARAMS_KEYS_ENUM, string]>
          ).map(([key, value]) => {
            if (FILTER_SEARCHPARAMS_DYNAMIC_KEYS.includes(key)) {
              return (
                <FilterBadge
                  key={`${key}-${value}`}
                  nodeType={(() => {
                    if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.hosts) {
                      return 'host';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.containerImages) {
                      return 'containerImage';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.clusters) {
                      return 'cluster';
                    } else if (key === FILTER_SEARCHPARAMS_KEYS_ENUM.containers) {
                      return 'container';
                    }
                    throw new Error('unknown key');
                  })()}
                  onRemove={onFilterRemove({ key, value })}
                  id={value}
                  label={FILTER_SEARCHPARAMS[key]}
                />
              );
            }
            return (
              <FilterBadge
                key={`${key}-${value}`}
                onRemove={onFilterRemove({ key, value })}
                text={value}
                label={FILTER_SEARCHPARAMS[key]}
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
    </FilterWrapper>
  );
};
const UniqueTable = () => {
  const { mode: theme } = useTheme();
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
              pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
              search: `?${searchParams.toString()}`,
            }}
            className="flex items-center gap-x-2"
          >
            <div className="p-2 bg-gray-100 dark:bg-gray-500/10 rounded-lg shrink-0">
              <div className="w-3 h-3 text-status-error">
                <VulnerabilityIcon />
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
        cell: (info) => (
          <div className="text-p4 text-text-text-and-icon gap-1 inline-flex">
            <SeverityBadgeIcon
              severity={info.getValue() as VulnerabilitySeverityType}
              theme={theme}
            />
            {upperFirst(info.getValue())}
          </div>
        ),
        header: () => <TruncatedText text="Severity" />,
        minSize: 80,
        size: 80,
        maxSize: 100,
      }),
      columnHelper.accessor('cve_cvss_score', {
        enableResizing: false,
        enableSorting: false,
        cell: (info) => (
          <div className="text-p3 text-text-text-and-icon">{info.getValue()}</div>
        ),
        header: () => <TruncatedText text="Score" />,
        minSize: 70,
        size: 60,
        maxSize: 85,
      }),
      columnHelper.accessor('cve_attack_vector', {
        enableSorting: false,
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Attack vector" />,
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
              <div className="w-4 h-4">
                <PopOutIcon />
              </div>
            </DFLink>
          );
        },
        header: () => <TruncatedText text="Exploit" />,
        minSize: 60,
        size: 60,
        maxSize: 70,
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
  }, [searchParams, theme]);

  const { data } = useSuspenseQuery({
    ...queries.vulnerability.uniqueVulnerabilities({
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      liveConnection: searchParams.getAll('liveConnection'),
      page: parseInt(searchParams.get('page') ?? '0', 10),
      order: getOrderFromSearchParams(searchParams),
      severity: searchParams.getAll('severity'),
      hostIds: searchParams.getAll('hosts'),
      containerIds: searchParams.getAll('containers'),
      containerImageIds: searchParams.getAll('containerImages'),
      clusterIds: searchParams.getAll('clusters'),
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

const UniqueVulnerabilities = () => {
  const isFetching = useIsFetching({
    queryKey: queries.vulnerability.uniqueVulnerabilities._def,
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [searchParams] = useSearchParams();

  return (
    <div>
      <BreadcrumbWrapper>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<VulnerabilityIcon />} isLink>
            <DFLink to={'/vulnerability'} unstyled>
              Vulnerabilities
            </DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Unique Vulnerabilities</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <div className="ml-2 flex items-center">
          {isFetching ? <CircleSpinner size="sm" /> : null}
        </div>
      </BreadcrumbWrapper>
      <div className="mx-4">
        <div className="h-12 flex items-center">
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
        </div>
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
  element: <UniqueVulnerabilities />,
};
