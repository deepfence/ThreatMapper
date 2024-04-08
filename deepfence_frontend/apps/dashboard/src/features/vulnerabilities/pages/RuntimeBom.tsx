import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { capitalize } from 'lodash-es';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { FileLineIcon } from '@/components/icons/common/FileLine';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { SbomModal } from '@/features/vulnerabilities/components/SBOMModal';
import { queries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { VulnerabilityScanGroupedStatus } from '@/utils/scan';
import { getOrderFromSearchParams, useSortingState } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

function useVulnerabilityScanList() {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.vulnerability.scanList({
      vulnerabilityScanStatus: VulnerabilityScanGroupedStatus.complete,
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      clusters: searchParams.getAll('clusters'),
      containers: searchParams.getAll('containers'),
      hosts: searchParams.getAll('hosts'),
      images: searchParams.getAll('containerImages'),
      languages: [],
      nodeTypes: searchParams.getAll('nodeType').length
        ? searchParams.getAll('nodeType')
        : ['container_image', 'container', 'host'],
      page: parseInt(searchParams.get('page') ?? '0', 10),
      order: getOrderFromSearchParams(searchParams),
    }),
    keepPreviousData: true,
  });
}

const RuntimeBom = () => {
  const isFetching = useIsFetching({
    queryKey: queries.vulnerability.scanList._def,
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
          <BreadcrumbLink icon={<FileLineIcon />}>
            <span className="inherit cursor-auto">Runtime BOM</span>
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
        <Suspense fallback={<TableSkeleton columns={11} rows={15} />}>
          <ScansTable />
        </Suspense>
      </div>
    </div>
  );
};

enum FILTER_SEARCHPARAMS_KEYS_ENUM {
  nodeType = 'nodeType',
  containerImages = 'containerImages',
  containers = 'containers',
  hosts = 'hosts',
  clusters = 'clusters',
}

const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [
  FILTER_SEARCHPARAMS_KEYS_ENUM.hosts,
  FILTER_SEARCHPARAMS_KEYS_ENUM.containerImages,
  FILTER_SEARCHPARAMS_KEYS_ENUM.clusters,
  FILTER_SEARCHPARAMS_KEYS_ENUM.containers,
];

const FILTER_SEARCHPARAMS: Record<FILTER_SEARCHPARAMS_KEYS_ENUM, string> = {
  nodeType: 'Node Type',
  containerImages: 'Container image',
  containers: 'Container',
  hosts: 'Host',
  clusters: 'Cluster',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [nodeType, setNodeType] = useState('');

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
          getDisplayValue={() => FILTER_SEARCHPARAMS['nodeType']}
          multiple
          value={searchParams.getAll('nodeType')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('nodeType');
              values.forEach((value) => {
                prev.append('nodeType', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setNodeType(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('nodeType');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['host', 'container', 'container_image']
            .filter((item) => {
              if (!nodeType.length) return true;
              return item.includes(nodeType.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>

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

const ScansTable = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useVulnerabilityScanList();
  const [sort, setSort] = useSortingState();

  const [selectedNode, setSelectedNode] = useState<{
    nodeName: string;
    scanId: string;
    nodeType: string;
  } | null>(null);

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<NonNullable<typeof data>['scans'][number]>();
    const columns = [
      columnHelper.accessor('node_type', {
        enableSorting: false,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2 capitalize">
              <div className="rounded-lg w-4 h-4 shrink-0">
                {IconMapForNodeType[info.getValue()]}
              </div>
              <TruncatedText text={info.getValue()?.replaceAll('_', ' ') ?? ''} />
            </div>
          );
        },
        header: () => <TruncatedText text="Type" />,
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
                    nodeName: info.row.original.node_name,
                    nodeType: info.row.original.node_type,
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
    <>
      <Table
        data={data.scans}
        columns={columns}
        enablePagination
        manualPagination
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
        enablePageResize
        onPageResize={(newSize) => {
          setSearchParams((prev) => {
            prev.set('size', String(newSize));
            prev.delete('page');
            return prev;
          });
        }}
      />
      {selectedNode ? (
        <SbomModal
          scanId={selectedNode.scanId}
          nodeName={selectedNode.nodeName}
          nodeType={selectedNode.nodeType}
          onClose={() => {
            setSelectedNode(null);
          }}
        />
      ) : null}
    </>
  );
};

export const module = {
  element: <RuntimeBom />,
};
