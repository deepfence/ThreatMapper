import { random } from 'lodash-es';
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
} from 'ui-components';

import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { TruncatedText } from '@/components/TruncatedText';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { getNodeImage } from '@/features/topology/utils/graph-styles';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { SCAN_STATUS_GROUPS } from '@/utils/scan';
import { useSortingState } from '@/utils/table';
import { CLOUD_PROVIDERS } from '@/utils/topology';

const DEFAULT_PAGE_SIZE = 25;

interface ModelCloudResource {
  id: string;
  name: string;
  service_name: string;
  resource_id: string;
  cloud_provider: 'aws' | 'gcp' | 'azure';
  cloud_provider_account_id: string;
  service_id: string;
  region: string;
  cloud_compliance_scan_id: string;
  cloud_compliance_status: string;
  issues: number;
}

const SERVICES: Record<
  'aws' | 'gcp' | 'azure',
  {
    name: string;
    service_name: string;
    accountId: string;
    service_id: string;
    region: string;
  }[]
> = {
  aws: [
    {
      name: 'demo-bucket',
      service_name: 'S3 Bucket',
      accountId: '23422488',
      service_id: 'aws_s3_bucket',
      region: 'us-east-1',
    },
    {
      name: 'i-24aa43b',
      service_name: 'EC2 Instance',
      service_id: 'aws_ec2_instance',
      accountId: '23422488',
      region: 'us-east-1',
    },
    {
      name: 'demo-function',
      accountId: '23422488',
      service_name: 'Lambda Function',
      service_id: 'aws_lambda_function',
      region: 'us-east-1',
    },
    {
      name: 'account-service-task',
      accountId: '23422488',
      service_name: 'ECS Task',
      service_id: 'aws_ecs_task',
      region: 'us-east-1',
    },
    {
      name: 'account-service-cluster',
      accountId: '23422488',
      service_name: 'ECS Cluster',
      service_id: 'aws_ecs_cluster',
      region: 'us-east-1',
    },
  ],
  gcp: [
    {
      name: 'ad-service-prod',
      service_name: 'SQL Database Instance',
      accountId: '4649876',
      service_id: 'gcp_sql_database_instance',
      region: 'asne1',
    },
    {
      name: 'ad-hero-images',
      service_name: 'Storage Bucket',
      service_id: 'gcp_storage_bucket',
      accountId: '23422488',
      region: 'asne1',
    },
    {
      name: 'i-1312333',
      accountId: '23422488',
      service_name: 'Compute Instance',
      service_id: 'gcp_compute_instance',
      region: 'asne1',
    },
    {
      name: 'disk-42342',
      accountId: '23422488',
      service_name: 'Compute Disk',
      service_id: 'gcp_compute_disk',
      region: 'asne1',
    },
  ],
  azure: [
    {
      name: 'photo-app',
      service_name: 'App Service Function App',
      accountId: '4649876',
      service_id: 'azure_app_service_function_app',
      region: 'westus3',
    },
    {
      name: 'i-34234234',
      service_name: 'Compute Virtual Machine',
      service_id: 'azure_compute_virtual_machine',
      accountId: '23422488',
      region: 'westus3',
    },
    {
      name: 'photo-app-container',
      accountId: '23422488',
      service_name: 'Storage container',
      service_id: 'azure_storage_container',
      region: 'westus3',
    },
    {
      name: 'photo-app-resize-queue',
      accountId: '23422488',
      service_name: 'Storage Queue',
      service_id: 'azure_storage_queue',
      region: 'westus3',
    },
    {
      name: 'photo-app-db',
      accountId: '23422488',
      service_name: 'Storage Table',
      service_id: 'azure_storage_table',
      region: 'westus3',
    },
  ],
};

const DUMMY_CLOUD_SERVICE_DATA: ModelCloudResource[] = [];

Object.keys(SERVICES).forEach((cloudProvider) => {
  SERVICES[cloudProvider as keyof typeof SERVICES].forEach((resource) => {
    DUMMY_CLOUD_SERVICE_DATA.push({
      id: `${random(0, 99999999)}`,
      name: resource.name,
      cloud_compliance_scan_id: '123123',
      cloud_compliance_status: random(10) <= 5 ? 'COMPLETE' : '',
      cloud_provider: cloudProvider as any,
      cloud_provider_account_id: resource.accountId,
      issues: random(0, 100),
      region: resource.region,
      resource_id: `${random(100000)}`,
      service_id: resource.service_id,
      service_name: resource.service_name,
    });
  });
});

export const CloudResourcesTable = () => {
  const [selectedNodes, setSelectedNodes] = useState<ModelCloudResource[]>([]);
  const [searchParams] = useSearchParams();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  return (
    <div className="px-4 pb-4">
      <div className="h-12 flex items-center">
        <BulkActions
          nodes={selectedNodes.map((host) => ({
            nodeId: host.resource_id,
            agentRunning: false,
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
                    nodeIds: nodesWithAgentRunning.map((node) => node.nodeId),
                    nodeType: VulnerabilityScanNodeTypeEnum.host,
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
                    nodeIds: nodesWithAgentRunning.map((node) => node.nodeId),
                    nodeType: SecretScanNodeTypeEnum.host,
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
                    nodeIds: nodesWithAgentRunning.map((node) => node.nodeId),
                    nodeType: MalwareScanNodeTypeEnum.host,
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

const FILTER_SEARCHPARAMS: Record<string, string> = {
  vulnerabilityScanStatus: 'Vulnerability scan status',
  secretScanStatus: 'Secret scan status',
  malwareScanStatus: 'Malware scan status',
  complianceScanStatus: 'Posture scan status',
  cloudProvider: 'Cloud provider',
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
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <div className="px-4 py-2.5 mb-4 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
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
}

function useSearchHostsWithPagination() {
  return {
    data: { resources: DUMMY_CLOUD_SERVICE_DATA, currentPage: 0, totalRows: 199 },
  };
  // const [searchParams] = useSearchParams();
  // return useSuspenseQuery({
  //   ...queries.search.hostsWithPagination({
  //     page: getPageFromSearchParams(searchParams),
  //     pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
  //     cloudProvider: searchParams.getAll('cloudProvider'),
  //     complianceScanStatus: searchParams.get('complianceScanStatus') as
  //       | ComplianceScanGroupedStatus
  //       | undefined,
  //     vulnerabilityScanStatus: searchParams.get('vulnerabilityScanStatus') as
  //       | VulnerabilityScanGroupedStatus
  //       | undefined,
  //     secretScanStatus: searchParams.get('secretScanStatus') as
  //       | SecretScanGroupedStatus
  //       | undefined,
  //     malwareScanStatus: searchParams.get('malwareScanStatus') as
  //       | MalwareScanGroupedStatus
  //       | undefined,
  //     order: getOrderFromSearchParams(searchParams),
  //   }),
  //   keepPreviousData: true,
  // });
}

const DataTable = ({
  setSelectedNodes,
}: {
  setSelectedNodes: React.Dispatch<React.SetStateAction<ModelCloudResource[]>>;
}) => {
  const { data } = useSearchHostsWithPagination();
  const columnHelper = createColumnHelper<ModelCloudResource>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();
  const [sort, setSort] = useSortingState();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setSelectedNodes((prev) => {
      const newSelectedNodes: ModelCloudResource[] = [];
      prev.forEach((node) => {
        if (rowSelectionState[node.resource_id] === true) {
          newSelectedNodes.push(node);
        }
      });
      Object.keys(rowSelectionState).forEach((nodeId) => {
        if (!newSelectedNodes.find((node) => node.resource_id === nodeId)) {
          newSelectedNodes.push(
            data.resources.find((node) => node.resource_id === nodeId)!,
          );
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
      columnHelper.accessor('name', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => 'name',
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('service_name', {
        cell: (info) => {
          return (
            <div className="flex items-center gap-2">
              <div className="shrink-0">
                <img
                  src={getNodeImage(info.row.original.service_id)}
                  alt={info.getValue()}
                  height={24}
                  width={24}
                />
              </div>
              {info.getValue()}
            </div>
          );
        },
        header: () => 'service name',
        minSize: 100,
        size: 120,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_provider', {
        cell: (info) => {
          return (
            <div className="flex items-center gap-2 uppercase">
              <div className="shrink-0">
                <img
                  src={getNodeImage('cloud_provider', info.getValue())}
                  alt={info.getValue()}
                  height={24}
                  width={24}
                />
              </div>
              {info.getValue()}
            </div>
          );
        },
        header: () => 'cloud provider',
        minSize: 100,
        size: 120,
        maxSize: 300,
      }),
      columnHelper.accessor('region', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => 'cloud region',
        minSize: 80,
        size: 100,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_compliance_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <TruncatedText text="Posture scan status" />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('issues', {
        cell: (info) => {
          if (info.row.original.cloud_compliance_status === 'COMPLETE') {
            return (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 text-chart-red">
                  <ErrorStandardSolidIcon />
                </div>
                {info.getValue()} issues
              </div>
            );
          }
          return '-';
        },
        header: () => <TruncatedText text="Issues" />,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('cloud_provider_account_id', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => 'account id',
        minSize: 70,
        size: 90,
        maxSize: 300,
      }),

      // columnHelper.accessor('os', {
      //   cell: (info) => {
      //     return <TruncatedText text={info.getValue() ?? ''} />;
      //   },
      //   header: () => <span>OS</span>,
      //   minSize: 50,
      //   size: 60,
      //   maxSize: 120,
      // }),
      // columnHelper.accessor('version', {
      //   cell: (info) => {
      //     return <TruncatedText text={info.getValue() ?? ''} />;
      //   },
      //   header: () => <TruncatedText text="Agent Version" />,
      //   minSize: 150,
      //   size: 200,
      //   maxSize: 300,
      // }),
    ],
    [],
  );

  return (
    <>
      <Table
        data={data.resources ?? []}
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
        getRowId={(row) => row.resource_id}
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
