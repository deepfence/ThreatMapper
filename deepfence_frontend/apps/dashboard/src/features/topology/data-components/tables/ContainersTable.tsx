import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  RowSelectionState,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { ModelContainer } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { queries } from '@/queries';
import {
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { formatMilliseconds } from '@/utils/date';
import {
  MalwareScanGroupedStatus,
  SCAN_STATUS_GROUPS,
  SecretScanGroupedStatus,
  VulnerabilityScanGroupedStatus,
} from '@/utils/scan';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';

const DEFAULT_PAGE_SIZE = 25;

export const ContainersTable = () => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  return (
    <div className="px-4 pb-4">
      <div className="h-12 flex items-center">
        <BulkActions nodeIds={selectedIds} />
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
        fallback={<TableSkeleton rows={DEFAULT_PAGE_SIZE} columns={6} size="default" />}
      >
        <DataTable
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
    </div>
  );
};

const BulkActions = ({ nodeIds }: { nodeIds: string[] }) => {
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!nodeIds.length}
        content={
          <>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.VulnerabilityScan,
                  data: {
                    nodes: nodeIds.map((nodeId) => {
                      return {
                        nodeId,
                        nodeType: VulnerabilityScanNodeTypeEnum.container,
                      };
                    }),
                  },
                });
              }}
              icon={<VulnerabilityIcon />}
            >
              Start Vulnerability Scan
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.SecretScan,
                  data: {
                    nodes: nodeIds.map((nodeId) => {
                      return {
                        nodeId,
                        nodeType: SecretScanNodeTypeEnum.container,
                      };
                    }),
                  },
                });
              }}
              icon={<SecretsIcon />}
            >
              Start Secret Scan
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.MalwareScan,
                  data: {
                    nodes: nodeIds.map((nodeId) => {
                      return {
                        nodeId,
                        nodeType: MalwareScanNodeTypeEnum.container,
                      };
                    }),
                  },
                });
              }}
              icon={<MalwareIcon />}
            >
              Start Malware Scan
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          endIcon={<CaretDown />}
          disabled={!nodeIds.length}
        >
          Actions
        </Button>
      </Dropdown>
      {!!scanOptions && (
        <ConfigureScanModal
          open
          onOpenChange={() => setScanOptions(undefined)}
          scanOptions={scanOptions}
        />
      )}
    </>
  );
};

enum FILTER_SEARCHPARAMS_KEYS_ENUM {
  vulnerabilityScanStatus = 'vulnerabilityScanStatus',
  secretScanStatus = 'secretScanStatus',
  malwareScanStatus = 'malwareScanStatus',
  hosts = 'hosts',
  clusters = 'clusters',
  containers = 'containers',
}

const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [
  FILTER_SEARCHPARAMS_KEYS_ENUM.hosts,
  FILTER_SEARCHPARAMS_KEYS_ENUM.clusters,
  FILTER_SEARCHPARAMS_KEYS_ENUM.containers,
];

const FILTER_SEARCHPARAMS: Record<FILTER_SEARCHPARAMS_KEYS_ENUM, string> = {
  vulnerabilityScanStatus: 'Vulnerability scan status',
  secretScanStatus: 'Secret scan status',
  malwareScanStatus: 'Malware scan status',
  hosts: 'Host',
  clusters: 'Cluster',
  containers: 'Container',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

function Filters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [vulnerabilityScanStatusSearchText, setVulnerabilityScanStatusSearchText] =
    useState('');
  const [secretScanStatusSearchText, setSecretScanStatusSearchText] = useState('');
  const [malwareScanStatusSearchText, setMalwareScanStatusSearchText] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

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

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <SearchableContainerList
          scanType={'none'}
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
        <Combobox
          value={SCAN_STATUS_GROUPS.find((groupStatus) => {
            return groupStatus.value === searchParams.get('vulnerabilityScanStatus');
          })}
          nullable
          onQueryChange={(query) => {
            setVulnerabilityScanStatusSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('vulnerabilityScanStatus', value.value);
              } else {
                prev.delete('vulnerabilityScanStatus');
              }
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['vulnerabilityScanStatus']}
        >
          {SCAN_STATUS_GROUPS.filter((item) => {
            if (!vulnerabilityScanStatusSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(vulnerabilityScanStatusSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <Combobox
          value={SCAN_STATUS_GROUPS.find((groupStatus) => {
            return groupStatus.value === searchParams.get('secretScanStatus');
          })}
          nullable
          onQueryChange={(query) => {
            setSecretScanStatusSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('secretScanStatus', value.value);
              } else {
                prev.delete('secretScanStatus');
              }
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['secretScanStatus']}
        >
          {SCAN_STATUS_GROUPS.filter((item) => {
            if (!secretScanStatusSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(secretScanStatusSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <Combobox
          value={SCAN_STATUS_GROUPS.find((groupStatus) => {
            return groupStatus.value === searchParams.get('malwareScanStatus');
          })}
          nullable
          onQueryChange={(query) => {
            setMalwareScanStatusSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('malwareScanStatus', value.value);
              } else {
                prev.delete('malwareScanStatus');
              }
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['malwareScanStatus']}
        >
          {SCAN_STATUS_GROUPS.filter((item) => {
            if (!malwareScanStatusSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(malwareScanStatusSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
        <SearchableHostList
          valueKey="hostName"
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
}

function useSearchContainersWithPagination() {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.search.containersWithPagination({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      hosts: searchParams.getAll('hosts'),
      vulnerabilityScanStatus: searchParams.get('vulnerabilityScanStatus') as
        | VulnerabilityScanGroupedStatus
        | undefined,
      secretScanStatus: searchParams.get('secretScanStatus') as
        | SecretScanGroupedStatus
        | undefined,
      malwareScanStatus: searchParams.get('malwareScanStatus') as
        | MalwareScanGroupedStatus
        | undefined,
      order: getOrderFromSearchParams(searchParams),
      clusterIds: searchParams.getAll('clusters'),
      containers: searchParams.getAll('containers'),
    }),
    keepPreviousData: true,
  });
}

const DataTable = ({
  rowSelectionState,
  setRowSelectionState,
}: {
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const { data } = useSearchContainersWithPagination();
  const columnHelper = createColumnHelper<ModelContainer>();
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();
  const [sort, setSort] = useSortingState();
  const [searchParams, setSearchParams] = useSearchParams();

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 50,
        size: 50,
        maxSize: 60,
      }),
      columnHelper.accessor('node_name', {
        cell: (info) => {
          let name = '';
          if (info.row.original.node_name.length > 0) {
            name = info.row.original.node_name;
          }
          return (
            <div className="flex items-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="truncate"
              >
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setClickedItem({
                      nodeId: info.row.original.node_id!,
                      nodeType: 'container',
                    });
                  }}
                >
                  <TruncatedText text={name} />
                </DFLink>
              </button>
            </div>
          );
        },
        header: () => 'Name',
        minSize: 150,
        size: 160,
        maxSize: 170,
      }),
      columnHelper.accessor('docker_container_created', {
        cell: (info) => {
          if (info.getValue()?.length) {
            return <TruncatedText text={formatMilliseconds(info.getValue())} />;
          }
          return '-';
        },
        header: () => <TruncatedText text={'Created on'} />,
        minSize: 100,
        size: 105,
        maxSize: 110,
      }),
      columnHelper.accessor('vulnerability_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text={'Vulnerability scan status'} />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('secret_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text={'Secret scan status'} />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('malware_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text={'Malware scan status'} />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
    ],
    [],
  );

  return (
    <>
      <Table
        data={data.containers ?? []}
        columns={columns}
        noDataElement={<TableNoDataElement text="No containers are connected" />}
        size="default"
        enableColumnResizing
        enablePagination
        manualPagination
        enableRowSelection
        approximatePagination
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={(row) => row.node_id}
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
      {clickedItem ? (
        <NodeDetailsStackedModal
          node={clickedItem}
          open={true}
          onOpenChange={(open) => {
            if (!open) setClickedItem(undefined);
          }}
        />
      ) : null}
    </>
  );
};
