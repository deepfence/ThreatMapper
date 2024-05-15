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
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { FilterWrapper } from '@/features/common/FilterWrapper';
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
  SCAN_STATUS_GROUPS,
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
        nodes: nodeIds.map((nodeId) => {
          return {
            nodeId,
            nodeType: VulnerabilityScanNodeTypeEnum.imageTag,
          };
        }),
      },
    };
  }

  if (scanType === ScanTypeEnum.SecretScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodes: nodeIds.map((nodeId) => {
          return {
            nodeId,
            nodeType: SecretScanNodeTypeEnum.imageTag,
          };
        }),
      },
    };
  }

  if (scanType === ScanTypeEnum.MalwareScan) {
    return {
      showAdvancedOptions: nodeIds.length === 1,
      scanType,
      data: {
        nodes: nodeIds.map((nodeId) => {
          return {
            nodeId,
            nodeType: MalwareScanNodeTypeEnum.imageTag,
          };
        }),
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
        sortBy: 'node_id',
        descending: true,
      },
      vulnerabilityScanStatus: searchParams.get('vulnerabilityScanStatus') as
        | VulnerabilityScanGroupedStatus
        | undefined,
      secretScanStatus: searchParams.get('secretScanStatus') as
        | SecretScanGroupedStatus
        | undefined,
      malwareScanStatus: searchParams.get('malwareScanStatus') as
        | MalwareScanGroupedStatus
        | undefined,
    }),
    keepPreviousData: true,
  });
};

const Header = () => {
  return (
    <BreadcrumbWrapper>
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
    </BreadcrumbWrapper>
  );
};

const useRegistryDetails = () => {
  const params = useParams() as {
    nodeId: string;
  };
  const nodeId = params?.nodeId;
  return useSuspenseQuery({
    ...queries.lookup.registryAccount({
      nodeIds: [nodeId],
    }),
  });
};

const DynamicBreadcrumbs = () => {
  const { account, nodeId, imageId } = useParams() as {
    account: string;
    nodeId: string;
    imageId: string;
  };

  const { data } = useRegistryDetails();

  return (
    <>
      <BreadcrumbLink>
        <DFLink
          to={generatePath('/registries/:account', {
            account: encodeURIComponent(account),
          })}
        >
          {account}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink>
        <DFLink
          to={generatePath('/registries/images/:account/:nodeId', {
            account: encodeURIComponent(account),
            nodeId: encodeURIComponent(nodeId),
          })}
        >
          {data.data?.[0]?.name ?? nodeId}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink isLast>
        <span className="inherit cursor-auto">{imageId}</span>
      </BreadcrumbLink>
    </>
  );
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  vulnerabilityScanStatus: 'Vulnerability scan status',
  secretScanStatus: 'Secret scan status',
  malwareScanStatus: 'Malware scan status',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  const [vulnerabilityScanStatusSearchText, setVulnerabilityScanStatusSearchText] =
    useState('');
  const [secretScanStatusSearchText, setSecretScanStatusSearchText] = useState('');
  const [malwareScanStatusSearchText, setMalwareScanStatusSearchText] = useState('');

  const params = useParams() as {
    nodeId: string;
    imageId: string;
  };

  if (!params.nodeId || !params.imageId) {
    console.warn('Node id, Image id not found');
  }

  return (
    <FilterWrapper>
      <div className="flex gap-2">
        <Combobox
          value={
            searchParams.get('vulnerabilityScanStatus')
              ? SCAN_STATUS_GROUPS.find((groupStatus) => {
                  return (
                    groupStatus.value === searchParams.get('vulnerabilityScanStatus')
                  );
                })
              : null
          }
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
          value={
            searchParams.get('secretScanStatus')
              ? SCAN_STATUS_GROUPS.find((groupStatus) => {
                  return groupStatus.value === searchParams.get('secretScanStatus');
                })
              : null
          }
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
          value={
            searchParams.get('malwareScanStatus')
              ? SCAN_STATUS_GROUPS.find((groupStatus) => {
                  return groupStatus.value === searchParams.get('malwareScanStatus');
                })
              : null
          }
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

  const [searchParams] = useSearchParams();

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
      <div className="h-12 flex items-center">
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
      {filtersExpanded ? <Filters /> : null}
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

      <div className="mx-4">
        <RegistryImagesTagsResults />
      </div>
    </>
  );
};

export const module = {
  element: <RegistryImageTags />,
};
