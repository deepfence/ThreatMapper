import { upperCase } from 'lodash-es';
import { useEffect, useMemo, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { LoaderFunctionArgs, useFetcher } from 'react-router-dom';
import {
  Button,
  Checkbox,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  IconButton,
  Popover,
  RowSelectionState,
  Select,
  SelectItem,
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
import { ApiError, makeRequest } from '@/utils/api';
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
  const vulnerabilityScanStatus =
    searchParams.get('vulnerability_scan_status')?.split(',') ?? [];
  const secretScanStatus = searchParams.get('secret_scan_status')?.split(',') ?? [];
  const malwareScanStatus = searchParams.get('malware_scan_status')?.split(',') ?? [];
  const complianceScanStatus =
    searchParams.get('compliance_scan_status')?.split(',') ?? [];
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
          },
        },
        match_filter: {
          filter_in: {},
        },
        order_filter: {
          order_fields: [],
        },
      },
      window: {
        offset: 0,
        size: 0,
      },
    },
    window: { offset: page * PAGE_SIZE, size: PAGE_SIZE },
  };
  if (vulnerabilityScanStatus.length) {
    searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
      ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
      vulnerability_scan_status: vulnerabilityScanStatus,
    };
  }
  if (secretScanStatus.length) {
    searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
      ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
      secret_scan_status: secretScanStatus,
    };
  }
  if (malwareScanStatus.length) {
    searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
      ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
      malware_scan_status: malwareScanStatus,
    };
  }
  if (complianceScanStatus.length) {
    searchSearchNodeReq.node_filter.filters.contains_filter.filter_in = {
      ...searchSearchNodeReq.node_filter.filters.contains_filter.filter_in,
      compliance_scan_status: complianceScanStatus,
    };
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

  const hostsData = await makeRequest({
    apiFunction: getSearchApiClient().searchHosts,
    apiArgs: [
      {
        searchSearchNodeReq,
      },
    ],
  });
  if (ApiError.isApiError(hostsData)) {
    throw hostsData;
  }

  const hostsDataCount = await makeRequest({
    apiFunction: getSearchApiClient().searchHostsCount,
    apiArgs: [
      {
        searchSearchNodeReq: {
          ...searchSearchNodeReq,
          window: {
            ...searchSearchNodeReq.window,
            size: 10 * searchSearchNodeReq.window.size,
          },
        },
      },
    ],
  });
  if (ApiError.isApiError(hostsDataCount)) {
    throw hostsDataCount;
  }

  return {
    hosts: hostsData,
    currentPage: page,
    totalRows: page * PAGE_SIZE + hostsDataCount.count,
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
        header: () => <span>Compliance scan status</span>,
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
          <div className="pl-4 text-sm">No rows selected</div>
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
                  showAdvancedOptions: false,
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
                  showAdvancedOptions: false,
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
                  showAdvancedOptions: false,
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
                  showAdvancedOptions: false,
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
              <span>Start Compliance Scan</span>
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
        // elementToFocusOnCloseRef={elementToFocusOnClose}
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
              <div className="flex flex-col gap-y-6 p-4">
                <fieldset>
                  <legend className="text-sm font-medium">
                    Vulnerability Scan Status
                  </legend>
                  <div className="flex gap-x-4 mt-1">
                    <Checkbox
                      label="Never Scanned"
                      checked={filters.vulnerabilityScanStatus.includes('')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            vulnerabilityScanStatus: [
                              ...filters.vulnerabilityScanStatus,
                              '',
                            ],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            vulnerabilityScanStatus:
                              filters.vulnerabilityScanStatus.filter(
                                (item) => item !== '',
                              ),
                          });
                        }
                      }}
                    />
                    <Checkbox
                      label="Complete"
                      checked={filters.vulnerabilityScanStatus.includes('COMPLETE')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            vulnerabilityScanStatus: [
                              ...filters.vulnerabilityScanStatus,
                              'COMPLETE',
                            ],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            vulnerabilityScanStatus:
                              filters.vulnerabilityScanStatus.filter(
                                (item) => item !== 'COMPLETE',
                              ),
                          });
                        }
                      }}
                    />
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-medium">Secret Scan Status</legend>
                  <div className="flex gap-x-4 mt-1">
                    <Checkbox
                      label="Never Scanned"
                      checked={filters.secretScanStatus.includes('')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            secretScanStatus: [...filters.secretScanStatus, ''],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            secretScanStatus: filters.secretScanStatus.filter(
                              (item) => item !== '',
                            ),
                          });
                        }
                      }}
                    />
                    <Checkbox
                      label="Complete"
                      checked={filters.secretScanStatus.includes('COMPLETE')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            secretScanStatus: [...filters.secretScanStatus, 'COMPLETE'],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            secretScanStatus: filters.secretScanStatus.filter(
                              (item) => item !== 'COMPLETE',
                            ),
                          });
                        }
                      }}
                    />
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-medium">Malware Scan Status</legend>
                  <div className="flex gap-x-4 mt-1">
                    <Checkbox
                      label="Never Scanned"
                      checked={filters.malwareScanStatus.includes('')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            malwareScanStatus: [...filters.malwareScanStatus, ''],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            malwareScanStatus: filters.malwareScanStatus.filter(
                              (item) => item !== '',
                            ),
                          });
                        }
                      }}
                    />
                    <Checkbox
                      label="Complete"
                      checked={filters.malwareScanStatus.includes('COMPLETE')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            malwareScanStatus: [...filters.malwareScanStatus, 'COMPLETE'],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            malwareScanStatus: filters.malwareScanStatus.filter(
                              (item) => item !== 'COMPLETE',
                            ),
                          });
                        }
                      }}
                    />
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-medium">Compliance Scan Status</legend>
                  <div className="flex gap-x-4 mt-1">
                    <Checkbox
                      label="Never Scanned"
                      checked={filters.complianceScanStatus.includes('')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            complianceScanStatus: [...filters.complianceScanStatus, ''],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            complianceScanStatus: filters.complianceScanStatus.filter(
                              (item) => item !== '',
                            ),
                          });
                        }
                      }}
                    />
                    <Checkbox
                      label="Complete"
                      checked={filters.complianceScanStatus.includes('COMPLETE')}
                      onCheckedChange={(state) => {
                        if (state) {
                          onFiltersChange({
                            ...filters,
                            complianceScanStatus: [
                              ...filters.complianceScanStatus,
                              'COMPLETE',
                            ],
                          });
                        } else {
                          onFiltersChange({
                            ...filters,
                            complianceScanStatus: filters.complianceScanStatus.filter(
                              (item) => item !== 'COMPLETE',
                            ),
                          });
                        }
                      }}
                    />
                  </div>
                </fieldset>
                <fieldset>
                  <Select
                    noPortal
                    name="cloud-provider"
                    label={'Cloud Provider'}
                    placeholder="Select Cloud Provider"
                    value={filters.cloudProvider}
                    sizing="xs"
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
                        <SelectItem value={cloudProvider} key={cloudProvider}>
                          {upperCase(cloudProvider)}
                        </SelectItem>
                      );
                    })}
                  </Select>
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
