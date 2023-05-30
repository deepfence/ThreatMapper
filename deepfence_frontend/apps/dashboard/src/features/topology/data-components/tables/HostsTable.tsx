import { upperCase } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  IconButton,
  Listbox,
  ListboxOption,
  Popover,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getSearchApiClient } from '@/api/api';
import { ModelHost, SearchSearchNodeReq } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { MalwareIcon } from '@/components/sideNavigation/icons/Malware';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { VulnerabilityIcon } from '@/components/sideNavigation/icons/Vulnerability';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import {
  ComplianceScanNodeTypeEnum,
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import { apiWrapper } from '@/utils/api';
import {
  COMPLIANCE_SCAN_STATUS_GROUPS,
  ComplianceScanGroupedStatus,
  MALWARE_SCAN_STATUS_GROUPS,
  MalwareScanGroupedStatus,
  SECRET_SCAN_STATUS_GROUPS,
  SecretScanGroupedStatus,
  VULNERABILITY_SCAN_STATUS_GROUPS,
  VulnerabilityScanGroupedStatus,
} from '@/utils/scan';
import { getOrderFromSearchParams, getPageFromSearchParams } from '@/utils/table';

type LoaderData = {
  hosts: ModelHost[];
  currentPage: number;
  totalRows: number;
};
const PAGE_SIZE = 20;

const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const searchParams = new URL(request.url).searchParams;
  const page = getPageFromSearchParams(searchParams);
  const vulnerabilityScanStatus = ((searchParams
    .get('vulnerability_scan_status')
    ?.split(',') ?? [])[0] ?? null) as VulnerabilityScanGroupedStatus | null;
  const secretScanStatus = ((searchParams.get('secret_scan_status')?.split(',') ??
    [])[0] ?? null) as SecretScanGroupedStatus | null;
  const malwareScanStatus = ((searchParams.get('malware_scan_status')?.split(',') ??
    [])[0] ?? null) as MalwareScanGroupedStatus | null;
  const complianceScanStatus = ((searchParams.get('compliance_scan_status')?.split(',') ??
    [])[0] ?? null) as ComplianceScanGroupedStatus | null;
  const cloudProvider = searchParams.get('cloud_provider')?.split(',') ?? [];
  const order = getOrderFromSearchParams(searchParams);

  const searchSearchNodeReq: SearchSearchNodeReq = {
    node_filter: {
      in_field_filter: [],
      filters: {
        compare_filter: [],
        contains_filter: {
          filter_in: {
            pseudo: [false],
            active: [true],
          },
        },
        match_filter: {
          filter_in: {},
        },
        order_filter: {
          order_fields: [],
        },
        not_contains_filter: {
          filter_in: {},
        },
      },
      window: {
        offset: 0,
        size: 0,
      },
    },
    window: { offset: page * PAGE_SIZE, size: PAGE_SIZE },
  };
  if (vulnerabilityScanStatus) {
    if (vulnerabilityScanStatus === VulnerabilityScanGroupedStatus.neverScanned) {
      searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
        vulnerability_scan_status: [
          ...VULNERABILITY_SCAN_STATUS_GROUPS.complete,
          ...VULNERABILITY_SCAN_STATUS_GROUPS.error,
          ...VULNERABILITY_SCAN_STATUS_GROUPS.inProgress,
          ...VULNERABILITY_SCAN_STATUS_GROUPS.starting,
        ],
      };
    } else {
      searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
        vulnerability_scan_status:
          VULNERABILITY_SCAN_STATUS_GROUPS[vulnerabilityScanStatus],
      };
    }
  }
  if (secretScanStatus) {
    if (secretScanStatus === SecretScanGroupedStatus.neverScanned) {
      searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
        secret_scan_status: [
          ...SECRET_SCAN_STATUS_GROUPS.complete,
          ...SECRET_SCAN_STATUS_GROUPS.error,
          ...SECRET_SCAN_STATUS_GROUPS.inProgress,
          ...SECRET_SCAN_STATUS_GROUPS.starting,
        ],
      };
    } else {
      searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
        secret_scan_status: SECRET_SCAN_STATUS_GROUPS[secretScanStatus],
      };
    }
  }
  if (malwareScanStatus) {
    if (malwareScanStatus === MalwareScanGroupedStatus.neverScanned) {
      searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
        malware_scan_status: [
          ...MALWARE_SCAN_STATUS_GROUPS.complete,
          ...MALWARE_SCAN_STATUS_GROUPS.error,
          ...MALWARE_SCAN_STATUS_GROUPS.inProgress,
          ...MALWARE_SCAN_STATUS_GROUPS.starting,
        ],
      };
    } else {
      searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
        malware_scan_status: MALWARE_SCAN_STATUS_GROUPS[malwareScanStatus],
      };
    }
  }
  if (complianceScanStatus) {
    if (complianceScanStatus === ComplianceScanGroupedStatus.neverScanned) {
      searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.not_contains_filter!.filter_in,
        compliance_scan_status: [
          ...COMPLIANCE_SCAN_STATUS_GROUPS.complete,
          ...COMPLIANCE_SCAN_STATUS_GROUPS.error,
          ...COMPLIANCE_SCAN_STATUS_GROUPS.inProgress,
          ...COMPLIANCE_SCAN_STATUS_GROUPS.starting,
        ],
      };
    } else {
      searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
        ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
        compliance_scan_status: COMPLIANCE_SCAN_STATUS_GROUPS[complianceScanStatus],
      };
    }
  }
  if (cloudProvider?.length) {
    searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
      ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
      cloud_provider: cloudProvider,
    };
  }
  if (order) {
    searchSearchNodeReq.node_filter.filters.order_filter.order_fields?.push({
      field_name: order.sortBy,
      descending: order.descending,
    });
  }

  const getThreatGraphApi = apiWrapper({
    fn: getSearchApiClient().searchHosts,
  });
  const hostsData = await getThreatGraphApi({
    searchSearchNodeReq,
  });

  if (!hostsData.ok) {
    throw hostsData;
  }

  const searchHostsCountApi = apiWrapper({
    fn: getSearchApiClient().searchHostsCount,
  });
  const hostsDataCount = await searchHostsCountApi({
    searchSearchNodeReq: {
      ...searchSearchNodeReq,
      window: {
        ...searchSearchNodeReq.window,
        size: 10 * searchSearchNodeReq.window.size,
      },
    },
  });

  if (!hostsDataCount.ok) {
    throw hostsDataCount;
  }

  return {
    hosts: hostsData.value,
    currentPage: page,
    totalRows: page * PAGE_SIZE + hostsDataCount.value.count,
  };
};

export const HostsTable = () => {
  const fetcher = useFetcher<LoaderData>();
  const columnHelper = createColumnHelper<LoaderData['hosts'][number]>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [filters, setFilters] = useState<HostsFilters>({
    vulnerabilityScanStatus: [],
    cloudProvider: [],
    secretScanStatus: [],
    malwareScanStatus: [],
    complianceScanStatus: [],
  });
  const [sortState, setSortState] = useState<SortingState>([]);
  const [page, setPage] = useState(0);
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();

  function fetchHostsData() {
    const searchParams = new URLSearchParams();
    searchParams.set('page', page.toString());
    if (filters.vulnerabilityScanStatus.length) {
      searchParams.set(
        'vulnerability_scan_status',
        filters.vulnerabilityScanStatus.join(','),
      );
    }
    if (filters.secretScanStatus.length) {
      searchParams.set('secret_scan_status', filters.secretScanStatus.join(','));
    }
    if (filters.malwareScanStatus.length) {
      searchParams.set('malware_scan_status', filters.malwareScanStatus.join(','));
    }
    if (filters.complianceScanStatus.length) {
      searchParams.set('compliance_scan_status', filters.complianceScanStatus.join(','));
    }
    if (filters.cloudProvider.length) {
      searchParams.set('cloud_provider', filters.cloudProvider.join(','));
    }
    if (sortState.length) {
      searchParams.set('sortby', sortState[0].id);
      searchParams.set('desc', String(sortState[0].desc));
    }
    fetcher.load(`/data-component/topology/table/hosts?${searchParams.toString()}`);
  }

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  useEffect(() => {
    fetchHostsData();
  }, [filters, sortState, page]);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 40,
        size: 40,
        maxSize: 40,
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
                  className="flex-1 shrink-0 pl-2"
                >
                  {name}
                </DFLink>
              </button>
            </div>
          );
        },
        header: () => 'name',
        minSize: 300,
        size: 400,
        maxSize: 600,
      }),
      columnHelper.accessor('vulnerability_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <span>Vulnerability scan status</span>,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('secret_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <span>Secret scan status</span>,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('malware_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <span>Malware scan status</span>,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('compliance_scan_status', {
        cell: (info) => {
          return <ScanStatusBadge status={info.getValue()} />;
        },
        header: () => <span>Posture scan status</span>,
        minSize: 100,
        size: 150,
        maxSize: 300,
      }),
      columnHelper.accessor('os', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>OS</span>,
        minSize: 50,
        size: 60,
        maxSize: 120,
      }),
      columnHelper.accessor('version', {
        cell: (info) => {
          return info.getValue();
        },
        header: () => <span>Agent Version</span>,
        minSize: 150,
        size: 200,
        maxSize: 300,
      }),
    ],
    [fetcher.data],
  );

  if (fetcher.state !== 'idle' && !fetcher.data) {
    return (
      <div className="mt-9">
        <TableSkeleton rows={10} columns={columns.length} size="sm" />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center h-9">
        {selectedIds.length ? (
          <BulkActionButton nodeIds={selectedIds} />
        ) : (
          <div className="text-gray-400 pl-4 text-sm">No rows selected</div>
        )}
        <Filters
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            setPage(0);
          }}
        />
      </div>
      <div>
        <Table
          data={fetcher.data?.hosts ?? []}
          columns={columns}
          noDataText="No hosts are connected"
          size="sm"
          enableColumnResizing
          enablePagination
          manualPagination
          enableRowSelection
          approximatePagination
          rowSelectionState={rowSelectionState}
          onRowSelectionChange={setRowSelectionState}
          getRowId={(row) => row.node_id}
          totalRows={fetcher.data?.totalRows}
          pageSize={PAGE_SIZE}
          pageIndex={fetcher.data?.currentPage}
          onPaginationChange={(updaterOrValue) => {
            let newPageIndex = 0;
            if (typeof updaterOrValue === 'function') {
              newPageIndex = updaterOrValue({
                pageIndex: fetcher.data?.currentPage ?? 0,
                pageSize: PAGE_SIZE,
              }).pageIndex;
            } else {
              newPageIndex = updaterOrValue.pageIndex;
            }
            setPage(newPageIndex);
          }}
          enableSorting
          manualSorting
          sortingState={sortState}
          onSortingChange={setSortState}
        />
      </div>
      {clickedItem ? (
        <NodeDetailsStackedModal
          node={clickedItem}
          open={true}
          onOpenChange={(open) => {
            if (!open) setClickedItem(undefined);
          }}
        />
      ) : null}
    </div>
  );
};

function BulkActionButton({ nodeIds }: { nodeIds: Array<string> }) {
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  return (
    <>
      <Dropdown
        content={
          <>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.VulnerabilityScan,
                  data: {
                    nodeIds,
                    nodeType: VulnerabilityScanNodeTypeEnum.host,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <VulnerabilityIcon />
              </span>
              <span>Start Vulnerability Scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.SecretScan,
                  data: {
                    nodeIds,
                    nodeType: SecretScanNodeTypeEnum.host,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <SecretsIcon />
              </span>
              <span>Start Secret Scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.MalwareScan,
                  data: {
                    nodeIds,
                    nodeType: MalwareScanNodeTypeEnum.host,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <MalwareIcon />
              </span>
              <span>Start Malware Scan</span>
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setScanOptions({
                  showAdvancedOptions: nodeIds.length === 1,
                  scanType: ScanTypeEnum.ComplianceScan,
                  data: {
                    nodeIds,
                    nodeType: ComplianceScanNodeTypeEnum.host,
                  },
                });
              }}
            >
              <span className="h-6 w-6">
                <PostureIcon />
              </span>
              <span>Start Posture Scan</span>
            </DropdownItem>
          </>
        }
      >
        <Button size="xs" color="primary" outline>
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
}

interface HostsFilters {
  vulnerabilityScanStatus: Array<string>;
  secretScanStatus: Array<string>;
  malwareScanStatus: Array<string>;
  complianceScanStatus: Array<string>;
  cloudProvider: Array<string>;
}

function Filters({
  filters,
  onFiltersChange,
}: {
  filters: HostsFilters;
  onFiltersChange: (filters: HostsFilters) => void;
}) {
  const isFilterApplied = useMemo(() => {
    return Object.values(filters).some((filter) => filter.length > 0);
  }, [filters]);
  return (
    <div className="relative ml-auto">
      {isFilterApplied && (
        <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
      )}
      <Popover
        triggerAsChild
        content={
          <div className="ml-auto w-[300px]">
            <div className="dark:text-white">
              <FilterHeader
                onReset={() => {
                  onFiltersChange({
                    vulnerabilityScanStatus: [],
                    secretScanStatus: [],
                    malwareScanStatus: [],
                    complianceScanStatus: [],
                    cloudProvider: [],
                  });
                }}
              />
              <div className="flex flex-col gap-y-2 p-4">
                <fieldset>
                  <div className="flex gap-x-4 mt-1">
                    <Listbox
                      placeholder="Select a status"
                      sizing="sm"
                      value={filters.vulnerabilityScanStatus[0] ?? null}
                      onChange={(val) => {
                        onFiltersChange({
                          ...filters,
                          vulnerabilityScanStatus: [val],
                        });
                      }}
                      label="Vulnerability Scan Status"
                    >
                      {[
                        {
                          label: 'Never Scanned',
                          value: VulnerabilityScanGroupedStatus.neverScanned,
                        },
                        {
                          label: 'Starting',
                          value: VulnerabilityScanGroupedStatus.starting,
                        },
                        {
                          label: 'In progress',
                          value: VulnerabilityScanGroupedStatus.inProgress,
                        },
                        {
                          label: 'Complete',
                          value: VulnerabilityScanGroupedStatus.complete,
                        },
                        {
                          label: 'Error',
                          value: VulnerabilityScanGroupedStatus.error,
                        },
                      ].map((val) => {
                        return (
                          <ListboxOption key={val.value} value={val.value}>
                            {val.label}
                          </ListboxOption>
                        );
                      })}
                    </Listbox>
                  </div>
                </fieldset>
                <fieldset>
                  <div className="flex gap-x-4 mt-1">
                    <Listbox
                      sizing="sm"
                      placeholder="Select a status"
                      value={filters.secretScanStatus[0] ?? null}
                      onChange={(val) => {
                        onFiltersChange({
                          ...filters,
                          secretScanStatus: [val],
                        });
                      }}
                      label="Secret Scan Status"
                    >
                      {[
                        {
                          label: 'Never Scanned',
                          value: SecretScanGroupedStatus.neverScanned,
                        },
                        {
                          label: 'Starting',
                          value: SecretScanGroupedStatus.starting,
                        },
                        {
                          label: 'In progress',
                          value: SecretScanGroupedStatus.inProgress,
                        },
                        {
                          label: 'Complete',
                          value: SecretScanGroupedStatus.complete,
                        },
                        {
                          label: 'Error',
                          value: SecretScanGroupedStatus.error,
                        },
                      ].map((val) => {
                        return (
                          <ListboxOption key={val.value} value={val.value}>
                            {val.label}
                          </ListboxOption>
                        );
                      })}
                    </Listbox>
                  </div>
                </fieldset>
                <fieldset>
                  <div className="flex gap-x-4 mt-1">
                    <Listbox
                      sizing="sm"
                      placeholder="Select a status"
                      value={filters.malwareScanStatus[0] ?? null}
                      onChange={(val) => {
                        onFiltersChange({
                          ...filters,
                          malwareScanStatus: [val],
                        });
                      }}
                      label="Malware Scan Status"
                    >
                      {[
                        {
                          label: 'Never Scanned',
                          value: MalwareScanGroupedStatus.neverScanned,
                        },
                        {
                          label: 'Starting',
                          value: MalwareScanGroupedStatus.starting,
                        },
                        {
                          label: 'In progress',
                          value: MalwareScanGroupedStatus.inProgress,
                        },
                        {
                          label: 'Complete',
                          value: MalwareScanGroupedStatus.complete,
                        },
                        {
                          label: 'Error',
                          value: MalwareScanGroupedStatus.error,
                        },
                      ].map((val) => {
                        return (
                          <ListboxOption key={val.value} value={val.value}>
                            {val.label}
                          </ListboxOption>
                        );
                      })}
                    </Listbox>
                  </div>
                </fieldset>
                <fieldset>
                  <div className="flex gap-x-4 mt-1">
                    <Listbox
                      sizing="sm"
                      placeholder="Select a status"
                      value={filters.complianceScanStatus[0] ?? null}
                      onChange={(val) => {
                        onFiltersChange({
                          ...filters,
                          complianceScanStatus: [val],
                        });
                      }}
                      label="Posture Scan Status"
                    >
                      {[
                        {
                          label: 'Never Scanned',
                          value: ComplianceScanGroupedStatus.neverScanned,
                        },
                        {
                          label: 'Starting',
                          value: ComplianceScanGroupedStatus.starting,
                        },
                        {
                          label: 'In progress',
                          value: ComplianceScanGroupedStatus.inProgress,
                        },
                        {
                          label: 'Complete',
                          value: ComplianceScanGroupedStatus.complete,
                        },
                        {
                          label: 'Error',
                          value: ComplianceScanGroupedStatus.error,
                        },
                      ].map((val) => {
                        return (
                          <ListboxOption key={val.value} value={val.value}>
                            {val.label}
                          </ListboxOption>
                        );
                      })}
                    </Listbox>
                  </div>
                </fieldset>
                <fieldset>
                  <Listbox
                    label={'Cloud Provider'}
                    placeholder="Select a provider"
                    value={filters.cloudProvider}
                    sizing="sm"
                    multiple
                    onChange={(value) => {
                      onFiltersChange({
                        ...filters,
                        cloudProvider: value,
                      });
                    }}
                  >
                    {[
                      'aws',
                      'gcp',
                      'azure',
                      'digital_ocean',
                      'aws_fargate',
                      'softlayer',
                      'private_cloud',
                    ].map((cloudProvider: string) => {
                      return (
                        <ListboxOption value={cloudProvider} key={cloudProvider}>
                          {upperCase(cloudProvider)}
                        </ListboxOption>
                      );
                    })}
                  </Listbox>
                </fieldset>
              </div>
            </div>
          </div>
        }
      >
        <IconButton
          size="xs"
          outline
          color="primary"
          className="rounded-lg bg-transparent"
          icon={<FiFilter />}
        />
      </Popover>
    </div>
  );
}

export const module = {
  loader,
};
