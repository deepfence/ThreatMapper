import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useEffect, useMemo, useState } from 'react';
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
  Tooltip,
} from 'ui-components';

import { ModelHost } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { ArrowUpCircleLine } from '@/components/icons/common/ArrowUpCircleLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { SearchableCloudAccountForHost } from '@/features/topology/data-components/tables/SearchableCloudAccountForHost';
import { queries } from '@/queries';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import {
  ComplianceScanGroupedStatus,
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
import { CLOUD_PROVIDERS } from '@/utils/topology';
import { isUpgradeAvailable } from '@/utils/version';

const DEFAULT_PAGE_SIZE = 25;

const useGetAgentVersions = () => {
  return useSuspenseQuery({
    ...queries.setting.listAgentVersion(),
  });
};

export const HostsTable = () => {
  const [selectedNodes, setSelectedNodes] = useState<ModelHost[]>([]);
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className="px-4 pb-4">
      <div className="h-12 flex items-center">
        <BulkActions
          nodes={selectedNodes.map((host) => ({
            nodeId: host.node_id,
            agentRunning: host.agent_running,
          }))}
        />
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
        <DataTable setSelectedNodes={setSelectedNodes} />
      </Suspense>
    </div>
  );
};

const BulkActions = ({
  nodes,
}: {
  nodes: {
    nodeId: string;
    agentRunning: boolean;
  }[];
}) => {
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  const nodesWithAgentRunning = nodes.filter((node) => node.agentRunning);
  return (
    <>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!nodesWithAgentRunning.length}
        content={
          <>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodesWithAgentRunning.length === 1,
                  scanType: ScanTypeEnum.VulnerabilityScan,
                  data: {
                    nodes: nodesWithAgentRunning.map((node) => {
                      return {
                        nodeId: node.nodeId,
                        nodeType: VulnerabilityScanNodeTypeEnum.host,
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
                  showAdvancedOptions: nodesWithAgentRunning.length === 1,
                  scanType: ScanTypeEnum.SecretScan,
                  data: {
                    nodes: nodesWithAgentRunning.map((node) => {
                      return {
                        nodeId: node.nodeId,
                        nodeType: SecretScanNodeTypeEnum.host,
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
                  showAdvancedOptions: nodesWithAgentRunning.length === 1,
                  scanType: ScanTypeEnum.MalwareScan,
                  data: {
                    nodes: nodesWithAgentRunning.map((node) => {
                      return {
                        nodeId: node.nodeId,
                        nodeType: MalwareScanNodeTypeEnum.host,
                      };
                    }),
                  },
                });
              }}
              icon={<MalwareIcon />}
            >
              Start Malware Scan
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodesWithAgentRunning.length === 1,
                  scanType: ScanTypeEnum.ComplianceScan,
                  data: {
                    nodeIds: nodesWithAgentRunning.map((node) => node.nodeId),
                    nodeType: ComplianceScanNodeTypeEnum.host,
                  },
                });
              }}
              icon={<PostureIcon />}
            >
              Start Posture Scan
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          endIcon={<CaretDown />}
          disabled={!nodesWithAgentRunning.length}
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
  complianceScanStatus = 'complianceScanStatus',
  cloudProvider = 'cloudProvider',
  agentRunning = 'agentRunning',
  clusters = 'clusters',
  hosts = 'hosts',
}

const FILTER_SEARCHPARAMS_DYNAMIC_KEYS = [
  FILTER_SEARCHPARAMS_KEYS_ENUM.hosts,
  FILTER_SEARCHPARAMS_KEYS_ENUM.clusters,
];

const FILTER_SEARCHPARAMS: Record<FILTER_SEARCHPARAMS_KEYS_ENUM, string> = {
  vulnerabilityScanStatus: 'Vulnerability scan status',
  secretScanStatus: 'Secret scan status',
  malwareScanStatus: 'Malware scan status',
  complianceScanStatus: 'Posture scan status',
  cloudProvider: 'Cloud provider',
  agentRunning: 'Agent running',
  clusters: 'Cluster',
  hosts: 'Host',
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
  const [complianceScanStatusSearchText, setComplianceScanStatusSearchText] =
    useState('');
  const [cloudProvidersSearchText, setCloudProvidersSearchText] = useState('');
  const [agentRunningSearchText, setAgentRunningSearchText] = useState('');
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
        <SearchableHostList
          scanType={'none'}
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
        <Combobox
          value={SCAN_STATUS_GROUPS.find((groupStatus) => {
            return groupStatus.value === searchParams.get('complianceScanStatus');
          })}
          nullable
          onQueryChange={(query) => {
            setComplianceScanStatusSearchText(query);
          }}
          onChange={(value) => {
            setSearchParams((prev) => {
              if (value) {
                prev.set('complianceScanStatus', value.value);
              } else {
                prev.delete('complianceScanStatus');
              }
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['complianceScanStatus']}
        >
          {SCAN_STATUS_GROUPS.filter((item) => {
            if (!complianceScanStatusSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(complianceScanStatusSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
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
          {CLOUD_PROVIDERS.filter((item) => {
            if (!cloudProvidersSearchText.length) return true;
            return item.label
              .toLowerCase()
              .includes(cloudProvidersSearchText.toLowerCase());
          }).map((item) => {
            return (
              <ComboboxOption key={item.value} value={item.value}>
                {item.label}
              </ComboboxOption>
            );
          })}
        </Combobox>
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
        <SearchableCloudAccountForHost
          defaultSelectedAccounts={searchParams.getAll('cloudAccounts')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('cloudAccounts');
              values.forEach((value) => {
                prev.append('cloudAccounts', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('cloudAccounts');
              prev.delete('page');
              return prev;
            });
          }}
        />
        <Combobox
          value={searchParams.getAll('agentRunning')}
          multiple
          onQueryChange={(query) => {
            setAgentRunningSearchText(query);
          }}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('agentRunning');
              values.forEach((value) => {
                prev.append('agentRunning', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          getDisplayValue={() => FILTER_SEARCHPARAMS['agentRunning']}
        >
          {['On', 'Off']
            .filter((item) => {
              if (!agentRunningSearchText.length) return true;
              return item.toLowerCase().includes(agentRunningSearchText.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {item}
                </ComboboxOption>
              );
            })}
        </Combobox>
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

function useSearchHostsWithPagination() {
  const [searchParams] = useSearchParams();
  return useSuspenseQuery({
    ...queries.search.hostsWithPagination({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      cloudProvider: searchParams.getAll('cloudProvider'),
      complianceScanStatus: searchParams.get('complianceScanStatus') as
        | ComplianceScanGroupedStatus
        | undefined,
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
      agentRunning: searchParams
        .getAll('agentRunning')
        .map((value) => (value === 'On' ? true : false)),
      cloudAccounts: searchParams.getAll('cloudAccounts'),
      clusterIds: searchParams.getAll('clusters'),
      hosts: searchParams.getAll('hosts'),
    }),
    keepPreviousData: true,
  });
}

const DataTable = ({
  setSelectedNodes,
}: {
  setSelectedNodes: React.Dispatch<React.SetStateAction<ModelHost[]>>;
}) => {
  const { data } = useSearchHostsWithPagination();
  const columnHelper = createColumnHelper<ModelHost>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();
  const [sort, setSort] = useSortingState();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: versionsData } = useGetAgentVersions();
  const versions = versionsData.versions ?? [];

  useEffect(() => {
    setSelectedNodes((prev) => {
      const newSelectedNodes: ModelHost[] = [];
      prev.forEach((node) => {
        if (rowSelectionState[node.node_id] === true) {
          newSelectedNodes.push(node);
        }
      });
      Object.keys(rowSelectionState).forEach((nodeId) => {
        if (!newSelectedNodes.find((node) => node.node_id === nodeId)) {
          newSelectedNodes.push(data.hosts.find((node) => node.node_id === nodeId)!);
        }
      });
      return newSelectedNodes;
    });
  }, [rowSelectionState, data]);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 50,
        size: 50,
        maxSize: 80,
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
                      nodeType: 'host',
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
        minSize: 300,
        size: 400,
        maxSize: 600,
      }),
      columnHelper.accessor('vulnerability_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Vulnerability scan status" />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('secret_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Secret scan status" />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('malware_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Malware scan status" />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('compliance_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Posture scan status" />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('os', {
        cell: (info) => {
          if (!info.getValue()) {
            return <div className="border-b w-[8px] border-text-icon"></div>;
          }
          return <TruncatedText text={info.getValue() ?? ''} />;
        },
        header: () => <span>OS</span>,
        minSize: 50,
        size: 60,
        maxSize: 120,
      }),
      columnHelper.accessor('agent_running', {
        cell: (info) => {
          return <TruncatedText text={info.getValue() ? 'Yes' : 'No'} />;
        },
        header: () => <TruncatedText text="Agent running?" />,
        minSize: 50,
        size: 60,
        maxSize: 120,
      }),
      columnHelper.accessor('version', {
        cell: (info) => {
          if (versions.length && info.row.original.agent_running) {
            const upgradeAvailable = isUpgradeAvailable(info.getValue(), versions);
            if (upgradeAvailable) {
              return (
                <div className="flex items-center gap-2 justify-start">
                  <div className="truncate">{info.getValue() ?? ''}</div>

                  <Tooltip
                    content={
                      <div className="flex-col gap-2 dark:text-text-text-and-icon text-text-text-inverse">
                        <div className="text-h5">Update Available</div>
                        <div className="text-p6">
                          Version <span className="text-h6">{versions[0]}</span> is
                          available. Please follow{' '}
                          <DFLink
                            href="https://community.deepfence.io/threatmapper/docs/sensors/"
                            target="_blank"
                            className="dark:text-text-link text-blue-500"
                          >
                            the instructions
                          </DFLink>{' '}
                          to upgrade the sensor probe. One click updates are available on{' '}
                          <DFLink
                            href="https://www.deepfence.io/threatstryker"
                            target="_blank"
                            className="dark:text-text-link text-blue-500"
                          >
                            ThreatStryker
                          </DFLink>
                          .
                        </div>
                      </div>
                    }
                  >
                    <div className="h-4 w-4 dark:text-status-warning">
                      <ArrowUpCircleLine />
                    </div>
                  </Tooltip>
                </div>
              );
            }
          }
          return <TruncatedText text={info.getValue() ?? ''} />;
        },
        header: () => <TruncatedText text="Agent version" />,
        minSize: 150,
        size: 200,
        maxSize: 300,
      }),
    ],
    [versions],
  );

  return (
    <>
      <Table
        data={data.hosts ?? []}
        columns={columns}
        noDataElement={<TableNoDataElement text="No hosts are connected" />}
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
