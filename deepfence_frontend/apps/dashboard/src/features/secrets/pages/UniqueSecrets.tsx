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

import { ModelSecret } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { SeverityBadgeIcon } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { TruncatedText } from '@/components/TruncatedText';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { ScanTypeEnum, SecretSeverityType } from '@/types/common';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

enum FILTER_SEARCHPARAMS_KEYS_ENUM {
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
  severity: 'Severity',
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
        <SearchableHostList
          scanType={ScanTypeEnum.SecretScan}
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
          scanType={ScanTypeEnum.SecretScan}
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
          scanType={ScanTypeEnum.SecretScan}
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
  const columnHelper = createColumnHelper<ModelSecret>();
  const [sort, setSort] = useSortingState();
  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('node_id', {
        enableResizing: true,
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
              search: `?${searchParams.toString()}`,
            }}
            className="flex items-center gap-x-2"
          >
            <div className="w-4 h-4 shrink-0 text-text-text-and-icon">
              <SecretsIcon />
            </div>
            <TruncatedText text={info.row.original.name ?? info.getValue() ?? ''} />
          </DFLink>
        ),
        header: () => <TruncatedText text="Name" />,
        minSize: 100,
        size: 120,
        maxSize: 130,
      }),
      columnHelper.accessor('full_filename', {
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Filename" />,
        minSize: 100,
        size: 120,
        maxSize: 125,
      }),
      columnHelper.accessor('matched_content', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Matched content" />,
        minSize: 100,
        size: 120,
        maxSize: 130,
      }),
      columnHelper.accessor('level', {
        enableResizing: true,
        cell: (info) => (
          <div className="text-p4 text-text-text-and-icon gap-1 inline-flex">
            <SeverityBadgeIcon
              severity={info.getValue() as SecretSeverityType}
              theme={theme}
            />
            {upperFirst(info.getValue())}
          </div>
        ),
        header: () => <TruncatedText text="Severity" />,
        minSize: 40,
        size: 50,
        maxSize: 100,
      }),
      columnHelper.accessor('signature_to_match', {
        enableResizing: true,
        enableSorting: false,
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => <TruncatedText text="Signature to match" />,
        minSize: 130,
        size: 140,
        maxSize: 145,
      }),
      columnHelper.accessor('part', {
        enableSorting: false,
        cell: (info) => <TruncatedText text={info.getValue() ?? ''} />,
        header: () => <TruncatedText text="Part" />,
        minSize: 40,
        size: 50,
        maxSize: 100,
      }),
    ];

    return columns;
  }, [searchParams, theme]);

  const { data } = useSuspenseQuery({
    ...queries.secret.uniqueSecrets({
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
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
      data={data.secrets ?? []}
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
      <BreadcrumbWrapper>
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
  element: <UniqueSecrets />,
};
