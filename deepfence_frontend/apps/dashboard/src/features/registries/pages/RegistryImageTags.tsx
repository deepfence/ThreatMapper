import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useCallback, useState } from 'react';
import { generatePath, useParams, useSearchParams } from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  Dropdown,
  DropdownItem,
  RowSelectionState,
  TableSkeleton,
} from 'ui-components';

import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { StartScanIcon } from '@/components/icons/registries/StartScan';
import { RegistryIcon } from '@/components/sideNavigation/icons/Registry';
import { RegistryImageTagsTable } from '@/features/registries/components/RegistryImageTagsTable';
import {
  ActionEnumType,
  RegistryScanType,
} from '@/features/registries/pages/RegistryImages';
import { queries } from '@/queries';
import {
  MalwareScanNodeTypeEnum,
  ScanTypeEnum,
  SecretScanNodeTypeEnum,
  VulnerabilityScanNodeTypeEnum,
} from '@/types/common';
import {
  MalwareScanGroupedStatus,
  SecretScanGroupedStatus,
  VulnerabilityScanGroupedStatus,
} from '@/utils/scan';
import { getOrderFromSearchParams, getPageFromSearchParams } from '@/utils/table';

const DEFAULT_PAGE_SIZE = 10;

const scanStatusMap = new Map();
scanStatusMap.set('complete', 'Completed');
scanStatusMap.set('in_progress', 'In Progress');
scanStatusMap.set('not_scan', 'Never scanned');
scanStatusMap.set('error', 'Failed');

function getScanOptions(
  scanType: ScanTypeEnum,
  nodeIds: string[],
): ConfigureScanModalProps['scanOptions'] {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodeIds,
        nodeType: VulnerabilityScanNodeTypeEnum.imageTag,
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodeIds,
        nodeType: SecretScanNodeTypeEnum.imageTag,
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodeIds,
        nodeType: MalwareScanNodeTypeEnum.imageTag,
      },
    };
  }

  throw new Error('invalid scan type');
}

export const useScanResults = () => {
  const [searchParams] = useSearchParams();
  const params = useParams() as {
    account: string;
    nodeId: string;
    imageId: string;
  };
  if (!params?.account || !params?.nodeId || !params?.imageId) {
    throw new Error('Account Type, Node Id and Image Id are required');
  }
  return useSuspenseQuery({
    ...queries.registry.registryScanResults({
      registryId: params.nodeId,
      imageId: params.imageId,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'last_updated',
        descending: true,
      },
      vulnerabilityScanStatus:
        searchParams.get('vulnerability_scan_status')?.split(',') ?? [],
      secretScanStatus: searchParams.get('secret_scan_status')?.split(',') ?? [],
      malwareScanStatus: searchParams.get('malware_scan_status')?.split(',') ?? [],
    }),
    keepPreviousData: true,
  });
};

const Header = () => {
  return (
    <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<RegistryIcon />} isLink>
            <DFLink to={'/registries'} unstyled>
              Registries
            </DFLink>
          </BreadcrumbLink>
          <Suspense
            fallback={
              <BreadcrumbLink isLast>
                <CircleSpinner size="sm" />
              </BreadcrumbLink>
            }
          >
            <DynamicBreadcrumbs />
          </Suspense>
        </Breadcrumb>
      </>
    </div>
  );
};

const DynamicBreadcrumbs = () => {
  const { account, nodeId, imageId } = useParams() as {
    account: string;
    nodeId: string;
    imageId: string;
  };
  return (
    <>
      <BreadcrumbLink icon={<RegistryIcon />}>
        <DFLink
          to={generatePath('/registries/:account', {
            account: encodeURIComponent(account),
          })}
        >
          {account}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink icon={<RegistryIcon />}>
        <DFLink
          to={generatePath('/registries/images/:account/:nodeId', {
            account: encodeURIComponent(account),
            nodeId: encodeURIComponent(nodeId),
          })}
        >
          {nodeId}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink icon={<RegistryIcon />} isLast>
        <span className="inherit cursor-auto">{imageId}</span>
      </BreadcrumbLink>
    </>
  );
};
interface ImageTagFilters {
  vulnerabilityScanStatus: Array<string>;
  secretScanStatus: Array<string>;
  malwareScanStatus: Array<string>;
}

const FILTER_SEARCHPARAMS: Record<string, string> = {
  vulnerabilityScanStatus: 'Vulnerability scan status',
  secretScanStatus: 'Secet scan status',
  malwareScanStatus: 'Malware scan status',
};
const vulnerabilityScanStatusFilter = [
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
];
const secretScanStatusFilter = [
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
];
const malwareScanStatusFilter = [
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
];

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = ({
  filters,
  onFiltersChange,
}: {
  filters: ImageTagFilters;
  onFiltersChange: (filters: ImageTagFilters) => void;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  const [vulnerabilityScanStatus, setVulnerabilityScanStatus] = useState('');
  const [secretScanStatus, setSecretScanStatus] = useState('');
  const [malwareScanStatus, setMalwareScanStatus] = useState('');

  const params = useParams() as {
    nodeId: string;
    imageId: string;
  };

  if (!params.nodeId || !params.imageId) {
    console.warn('Node id, Image id not found');
  }

  return (
    <div className="px-4 py-2.5 mb-4 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['vulnerabilityScanStatus']}
          multiple
          value={searchParams.get('vulnerability_scan_status')?.split(',')}
          onChange={(values) => {
            onFiltersChange({
              ...filters,
              vulnerabilityScanStatus: values,
            });
          }}
          onQueryChange={(query) => {
            setVulnerabilityScanStatus(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            onFiltersChange({
              vulnerabilityScanStatus: [],
              secretScanStatus: filters.secretScanStatus,
              malwareScanStatus: filters.malwareScanStatus,
            });
          }}
        >
          {vulnerabilityScanStatusFilter
            .filter((item) => {
              if (!vulnerabilityScanStatus.length) return true;
              return item.value.includes(vulnerabilityScanStatus.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item.value} value={item.value}>
                  {item.label}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['secretScanStatus']}
          multiple
          value={searchParams.get('secretScanStatus')?.split(',')}
          onChange={(values) => {
            onFiltersChange({
              ...filters,
              secretScanStatus: values,
            });
          }}
          onQueryChange={(query) => {
            setSecretScanStatus(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            onFiltersChange({
              vulnerabilityScanStatus: filters.vulnerabilityScanStatus,
              secretScanStatus: [],
              malwareScanStatus: filters.malwareScanStatus,
            });
          }}
        >
          {secretScanStatusFilter
            .filter((item) => {
              if (!secretScanStatus.length) return true;
              return item.value.includes(secretScanStatus.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item.value} value={item.value}>
                  {item.label}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['malwareScanStatus']}
          multiple
          value={searchParams.get('malwareScanStatus')?.split(',')}
          onChange={(values) => {
            onFiltersChange({
              ...filters,
              malwareScanStatus: values,
            });
          }}
          onQueryChange={(query) => {
            setMalwareScanStatus(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            onFiltersChange({
              vulnerabilityScanStatus: filters.vulnerabilityScanStatus,
              secretScanStatus: filters.secretScanStatus,
              malwareScanStatus: [],
            });
          }}
        >
          {malwareScanStatusFilter
            .filter((item) => {
              if (!malwareScanStatus.length) return true;
              return item.value.includes(malwareScanStatus.toLowerCase());
            })
            .map((item) => {
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
};

const BulkActions = ({
  ids,
  onTableAction,
}: {
  ids: string[];
  onTableAction: (ids: string[], scanType: RegistryScanType, actionType: string) => void;
}) => {
  return (
    <>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            <DropdownItem
              onClick={() =>
                onTableAction(
                  ids,
                  ScanTypeEnum.VulnerabilityScan,
                  ActionEnumType.START_SCAN,
                )
              }
            >
              Start Vulnerability Scan
            </DropdownItem>
            <DropdownItem
              onClick={() =>
                onTableAction(ids, ScanTypeEnum.SecretScan, ActionEnumType.START_SCAN)
              }
            >
              Start Secret Scan
            </DropdownItem>
            <DropdownItem
              onClick={() =>
                onTableAction(ids, ScanTypeEnum.MalwareScan, ActionEnumType.START_SCAN)
              }
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
          startIcon={<StartScanIcon />}
          endIcon={<CaretDown />}
          disabled={!ids.length}
        >
          Start scan
        </Button>
      </Dropdown>
    </>
  );
};
const RegistryImagesTagsResults = () => {
  const [selectedScanType, setSelectedScanType] = useState<RegistryScanType>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [nodeIdsToScan, setNodeIdsToScan] = useState<string[]>([]);

  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<ImageTagFilters>({
    vulnerabilityScanStatus: [],
    secretScanStatus: [],
    malwareScanStatus: [],
  });

  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const onTableAction = useCallback(
    (nodeIds: string[], scanType: RegistryScanType, _: string) => {
      setNodeIdsToScan(nodeIds);
      setSelectedScanType(scanType);
    },
    [],
  );

  return (
    <div className="self-start">
      <div className="py-2 flex items-center">
        <BulkActions
          ids={Object.keys(rowSelectionState).map((key) => key.split('<==>')[0])}
          onTableAction={onTableAction}
        />
        <div className="pr-2 ml-auto flex items-center gap-1">
          <Button
            className="pr-0"
            color="default"
            variant="flat"
            size="sm"
            startIcon={<FilterIcon />}
            onClick={() => {
              setFiltersExpanded((prev) => !prev);
            }}
          >
            Filter
          </Button>
          {getAppliedFiltersCount(searchParams) > 0 ? (
            <Badge
              label={String(getAppliedFiltersCount(searchParams))}
              variant="filled"
              size="small"
              color="blue"
            />
          ) : null}
        </div>
        <ConfigureScanModal
          open={!!selectedScanType}
          onOpenChange={() => setSelectedScanType(undefined)}
          scanOptions={
            selectedScanType ? getScanOptions(selectedScanType, nodeIdsToScan) : undefined
          }
        />
      </div>
      {filtersExpanded ? (
        <Filters
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            if (newFilters.vulnerabilityScanStatus.length) {
              searchParams.set(
                'vulnerability_scan_status',
                newFilters.vulnerabilityScanStatus.join(','),
              );
            }
            if (newFilters.secretScanStatus.length) {
              searchParams.set(
                'secret_scan_status',
                newFilters.secretScanStatus.join(','),
              );
            }
            if (newFilters.malwareScanStatus.length) {
              searchParams.set(
                'malware_scan_status',
                newFilters.malwareScanStatus.join(','),
              );
            }
            setSearchParams((prev) => {
              prev.set('page', String(0));
              return prev;
            });
          }}
        />
      ) : null}
      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <RegistryImageTagsTable
          onTableAction={onTableAction}
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
    </div>
  );
};

const RegistryImageTags = () => {
  return (
    <>
      <Header />

      <div className="px-4 pb-4">
        <RegistryImagesTagsResults />
      </div>
    </>
  );
};

export const module = {
  element: <RegistryImageTags />,
};
