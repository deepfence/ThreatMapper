import { useSuspenseInfiniteQuery, useSuspenseQuery } from '@suspensive/react-query';
import { debounce } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { generatePath, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelCloudResource, ModelCloudResourceCloudProviderEnum } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableCloudAccountsList } from '@/components/forms/SearchableCloudAccountsList';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { TruncatedText } from '@/components/TruncatedText';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import { queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import { isScanComplete } from '@/utils/scan';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';

const DEFAULT_PAGE_SIZE = 25;

function useSearchCloudResourcesWithPagination() {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.search.cloudResourcesWithPagination({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams),
      cloudProvider: searchParams.getAll('cloudProvider'),
      serviceType: searchParams.getAll('serviceType'),
      awsAccountId: searchParams.getAll('aws_account_ids'),
      gcpAccountId: searchParams.getAll('gcp_account_ids'),
      azureAccountId: searchParams.getAll('azure_account_ids'),
    }),
    keepPreviousData: true,
  });
}

export const CloudResourcesTable = () => {
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className="px-4 pb-4">
      <div className="h-12 flex items-center">
        <Button
          variant="flat"
          className="ml-auto"
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
      <Suspense
        fallback={<TableSkeleton rows={DEFAULT_PAGE_SIZE} columns={8} size="default" />}
      >
        <DataTable />
      </Suspense>
    </div>
  );
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  cloudProvider: 'Cloud provider',
  serviceType: 'Service type',
  aws_account_ids: 'AWS account',
  gcp_account_ids: 'GCP account',
  azure_account_ids: 'Azure account',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

function getCloudResourcePrettyName(provider: ModelCloudResourceCloudProviderEnum) {
  switch (provider) {
    case ModelCloudResourceCloudProviderEnum.Aws:
      return 'AWS';
    case ModelCloudResourceCloudProviderEnum.Gcp:
      return 'GCP';
    case ModelCloudResourceCloudProviderEnum.Azure:
      return 'AZURE';
    default:
      // eslint-disable-next-line no-case-declarations
      const _exhaustiveCheck: never = provider;
      throw new Error(`Unhandled case: ${_exhaustiveCheck}`);
  }
}

function SearchableServiceType() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');

  const selected = searchParams.getAll('serviceType');
  const { data, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useSuspenseInfiniteQuery({
      ...queries.common.searchCloudService({
        size: 100,
        searchText,
      }),
      keepPreviousData: true,
      getNextPageParam: (lastPage, allPages) => {
        return allPages.length * 100;
      },
      getPreviousPageParam: (firstPage, allPages) => {
        if (!allPages.length) return 0;
        return (allPages.length - 1) * 100;
      },
    });

  const searchQuery = debounce((query: string) => {
    setSearchText(query);
  }, 1000);

  const onEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  return (
    <Combobox
      value={selected}
      nullable
      multiple
      onEndReached={onEndReached}
      startIcon={
        isFetchingNextPage ? <CircleSpinner size="sm" className="w-3 h-3" /> : undefined
      }
      getDisplayValue={() => {
        return FILTER_SEARCHPARAMS['serviceType'];
      }}
      onClearAll={() => {
        setSearchParams((prev) => {
          prev.delete('serviceType');
          prev.delete('page');
          return prev;
        });
      }}
      clearAllElement="Clear"
      onQueryChange={searchQuery}
      onChange={(values) => {
        setSearchParams((prev) => {
          prev.delete('serviceType');
          values.forEach((value) => {
            prev.append('serviceType', value);
          });
          prev.delete('page');
          return prev;
        });
      }}
    >
      {data?.pages
        .flatMap((page) => {
          return page.data;
        })
        .map((item) => {
          return (
            <ComboboxOption key={item} value={item}>
              {item}
            </ComboboxOption>
          );
        })}
    </Combobox>
  );
}

function ServiceType() {
  const [searchParams] = useSearchParams();
  return (
    <Suspense
      fallback={
        <>
          <Combobox
            startIcon={<CircleSpinner size="sm" className="w-3 h-3" />}
            getDisplayValue={() => {
              return FILTER_SEARCHPARAMS['serviceType'];
            }}
            value={searchParams.getAll('serviceType')}
            multiple
            onQueryChange={() => {
              // no operation
            }}
          />
        </>
      }
    >
      <SearchableServiceType />
    </Suspense>
  );
}

function Filters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [cloudProvidersSearchText, setCloudProvidersSearchText] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <Combobox
          value={searchParams.getAll('cloudProvider')}
          multiple
          onQueryChange={(query) => {
            setCloudProvidersSearchText(query);
          }}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('cloudProvider');
              values.forEach((value) => {
                prev.append('cloudProvider', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['cloudProvider']}
        >
          {Object.values(ModelCloudResourceCloudProviderEnum)
            .filter((item) => {
              if (!cloudProvidersSearchText.length) return true;
              return item.includes(cloudProvidersSearchText.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {getCloudResourcePrettyName(
                    item as ModelCloudResourceCloudProviderEnum,
                  )}
                </ComboboxOption>
              );
            })}
        </Combobox>

        <ServiceType />
        <SearchableCloudAccountsList
          cloudProvider="aws"
          displayValue="AWS account"
          defaultSelectedAccounts={searchParams.getAll('aws_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('aws_account_ids');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('aws_account_ids');
              value.forEach((id) => {
                prev.append('aws_account_ids', id);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableCloudAccountsList
          cloudProvider="gcp"
          displayValue="GCP account"
          defaultSelectedAccounts={searchParams.getAll('gcp_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('gcp_account_ids');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('gcp_account_ids');
              value.forEach((id) => {
                prev.append('gcp_account_ids', id);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
        <SearchableCloudAccountsList
          cloudProvider="azure"
          displayValue="Azure account"
          defaultSelectedAccounts={searchParams.getAll('azure_account_ids')}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('azure_account_ids');
              prev.delete('page');
              return prev;
            });
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              prev.delete('azure_account_ids');
              value.forEach((id) => {
                prev.append('azure_account_ids', id);
              });
              prev.delete('page');
              return prev;
            });
          }}
        />
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
    </FilterWrapper>
  );
}

const DataTable = () => {
  const { mode } = useTheme();
  const { data } = useSearchCloudResourcesWithPagination();
  const columnHelper = createColumnHelper<ModelCloudResource>();
  const [sort, setSort] = useSortingState();
  const [searchParams, setSearchParams] = useSearchParams();

  const columns = useMemo(
    () => [
      columnHelper.accessor('node_name', {
        cell: (info) => {
          if (isScanComplete(info.row.original.cloud_compliance_scan_status)) {
            return (
              <DFLink
                to={{
                  pathname: generatePath(
                    `/posture/cloud/scan-results/:cloudProvider/:scanId`,
                    {
                      scanId: encodeURIComponent(
                        info.row.original.cloud_compliance_latest_scan_id,
                      ),
                      cloudProvider: info.row.original.cloud_provider,
                    },
                  ),
                  search: `?resources=${encodeURIComponent(info.row.original.node_id)}`,
                }}
                target="_blank"
              >
                <TruncatedText text={info.getValue()} />
              </DFLink>
            );
          }
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => 'Name',
        minSize: 100,
        size: 180,
        maxSize: 300,
      }),
      columnHelper.accessor('node_type', {
        cell: (info) => {
          const imagePath =
            getNodeImage(mode, info.row.original.node_type) ??
            getNodeImage(mode, 'cloud_provider', info.row.original.cloud_provider);
          return (
            <div className="flex items-center gap-2">
              <div className="shrink-0 text-text-input-value">
                <img src={imagePath} alt={info.getValue()} height={24} width={24} />
              </div>
              <TruncatedText text={info.getValue()} />
            </div>
          );
        },
        header: () => <TruncatedText text="Service type" />,
        minSize: 80,
        size: 100,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_provider', {
        cell: (info) => {
          return (
            <div className="flex items-center gap-2 uppercase">
              <div className="shrink-0">
                <img
                  src={getNodeImage(mode, 'cloud_provider', info.getValue())}
                  alt={info.getValue()}
                  height={24}
                  width={24}
                />
              </div>
              <TruncatedText text={info.getValue()} />
            </div>
          );
        },
        header: () => <TruncatedText text="Cloud provider" />,
        minSize: 50,
        size: 80,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_region', {
        cell: (info) => {
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => <TruncatedText text="Cloud region" />,
        minSize: 50,
        size: 70,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_compliance_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Posture scan status" />,
        minSize: 60,
        size: 100,
        maxSize: 300,
        enableSorting: true,
      }),
      columnHelper.accessor('account_id', {
        cell: (info) => {
          if (isScanComplete(info.row.original.cloud_compliance_scan_status)) {
            return (
              <DFLink
                to={{
                  pathname: generatePath(
                    `/posture/cloud/scan-results/:cloudProvider/:scanId`,
                    {
                      scanId: encodeURIComponent(
                        info.row.original.cloud_compliance_latest_scan_id,
                      ),
                      cloudProvider: info.row.original.cloud_provider,
                    },
                  ),
                }}
                target="_blank"
              >
                <TruncatedText text={info.getValue()} />
              </DFLink>
            );
          }
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => <TruncatedText text="Account id" />,
        minSize: 70,
        size: 120,
        maxSize: 300,
      }),
    ],
    [],
  );

  return (
    <Table
      data={data.resources ?? []}
      columns={columns}
      noDataElement={<TableNoDataElement text="No cloud resources are connected" />}
      size="default"
      enableColumnResizing
      enablePagination
      manualPagination
      approximatePagination
      totalRows={data.totalRows}
      pageIndex={data.currentPage}
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: data.currentPage,
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
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
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
