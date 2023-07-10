import { useSuspenseQuery } from '@suspensive/react-query';
import { capitalize } from 'lodash-es';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  generatePath,
  Outlet,
  useFetcher,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  getRowSelectionColumn,
  IconButton,
  Modal,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient } from '@/api/api';
import {
  ModelCloudCompliance,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { BellLineIcon } from '@/components/icons/common/BellLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ClockLineIcon } from '@/components/icons/common/ClockLine';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { EyeHideSolid } from '@/components/icons/common/EyeHideSolid';
import { EyeSolidIcon } from '@/components/icons/common/EyeSolid';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TaskIcon } from '@/components/icons/common/Task';
import { TimesIcon } from '@/components/icons/common/Times';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { ScanHistoryDropdown } from '@/components/scan-history/HistoryList';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { ScanStatusInError, ScanStatusInProgress } from '@/components/ScanStatusMessage';
import { PostureStatusBadge } from '@/components/SeverityBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { POSTURE_STATUS_COLORS } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { useGetCloudFilters } from '@/features/common/data-component/searchCloudFiltersApiLoader';
import { PostureScanResultsPieChart } from '@/features/postures/components/scan-result/PostureScanResultsPieChart';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import {
  ComplianceScanNodeTypeEnum,
  PostureSeverityType,
  ScanStatusEnum,
  ScanTypeEnum,
} from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { abbreviateNumber } from '@/utils/number';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

export interface FocusableElement {
  focus(options?: FocusOptions): void;
}
enum ActionEnumType {
  MASK = 'mask',
  UNMASK = 'unmask',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  NOTIFY = 'notify',
  DELETE_SCAN = 'delete_scan',
}

const DEFAULT_PAGE_SIZE = 10;

type ActionFunctionType =
  | ReturnType<typeof getScanResultsApiClient>['deleteScanResult']
  | ReturnType<typeof getScanResultsApiClient>['maskScanResult']
  | ReturnType<typeof getScanResultsApiClient>['notifyScanResult']
  | ReturnType<typeof getScanResultsApiClient>['unmaskScanResult'];

type ActionData = {
  action: ActionEnumType;
  success: boolean;
  message?: string;
} | null;

const action = async ({
  params: { scanId = '' },
  request,
}: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const ids = (formData.getAll('nodeIds[]') ?? []) as string[];
  const actionType = formData.get('actionType');
  const _scanId = scanId;
  if (!_scanId) {
    throw new Error('Scan ID is required');
  }
  if (!actionType) {
    return null;
  }

  let result = null;
  let apiFunction: ActionFunctionType | null = null;
  if (actionType === ActionEnumType.DELETE || actionType === ActionEnumType.NOTIFY) {
    apiFunction =
      actionType === ActionEnumType.DELETE
        ? getScanResultsApiClient().deleteScanResult
        : getScanResultsApiClient().notifyScanResult;
    const resultApi = apiWrapper({
      fn: apiFunction,
    });

    result = await resultApi({
      modelScanResultsActionRequest: {
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.CloudComplianceScan,
      },
    });

    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        return {
          action: actionType,
          success: false,
          message: result.error.message,
        };
      } else if (result.error.response.status === 403) {
        if (actionType === ActionEnumType.DELETE) {
          return {
            action: actionType,
            success: false,
            message: 'You do not have enough permissions to delete compliance',
          };
        } else if (actionType === ActionEnumType.NOTIFY) {
          return {
            action: actionType,
            success: false,
            message: 'You do not have enough permissions to notify',
          };
        }
      }
    }
  } else if (actionType === ActionEnumType.MASK || actionType === ActionEnumType.UNMASK) {
    apiFunction =
      actionType === ActionEnumType.MASK
        ? getScanResultsApiClient().maskScanResult
        : getScanResultsApiClient().unmaskScanResult;
    const resultApi = apiWrapper({
      fn: apiFunction,
    });
    result = await resultApi({
      modelScanResultsMaskRequest: {
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.CloudComplianceScan,
      },
    });
    if (!result.ok) {
      if (actionType === ActionEnumType.MASK) {
        toast.error('You do not have enough permissions to mask');
        return {
          action: actionType,
          success: false,
          message: 'You do not have enough permissions to mask',
        };
      } else if (actionType === ActionEnumType.UNMASK) {
        toast.error('You do not have enough permissions to unmask');
        return {
          action: actionType,
          success: false,
          message: 'You do not have enough permissions to unmask',
        };
      }
    }
  } else if (actionType === ActionEnumType.DELETE_SCAN) {
    const deleteScan = apiWrapper({
      fn: getScanResultsApiClient().deleteScanResultsForScanID,
    });

    const result = await deleteScan({
      scanId: formData.get('scanId') as string,
      scanType: ScanTypeEnum.CloudComplianceScan,
    });

    if (!result.ok) {
      if (result.error.response.status === 403) {
        return {
          action: actionType,
          message: 'You do not have enough permissions to delete scan',
          success: false,
        };
      }
      throw new Error('Error deleting scan');
    }
  }
  invalidateAllQueries();

  if (actionType === ActionEnumType.DELETE || actionType === ActionEnumType.DELETE_SCAN) {
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.NOTIFY) {
    toast.success('Notified successfully');
  } else if (actionType === ActionEnumType.MASK) {
    toast.success('Masked successfully');
  } else if (actionType === ActionEnumType.UNMASK) {
    toast.success('Unmasked successfully');
  }
  return null;
};

const useScanResults = () => {
  const [searchParams] = useSearchParams();
  const params = useParams() as {
    scanId: string;
    nodeType: string;
  };
  const scanId = params?.scanId;
  const nodeType = params?.nodeType;
  return useSuspenseQuery({
    ...queries.posture.postureCloudScanResults({
      scanId,
      nodeType,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'status',
        descending: true,
      },
      benchmarkTypes: searchParams.getAll('benchmarkType'),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      services: searchParams.getAll('services'),
    }),
    keepPreviousData: true,
  });
};

const DeleteConfirmationModal = ({
  showDialog,
  ids,
  setShowDialog,
  onDeleteSuccess,
}: {
  showDialog: boolean;
  ids: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onDeleteSuccess: () => void;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('nodeIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE
    ) {
      onDeleteSuccess();
    }
  }, [fetcher]);

  return (
    <Modal
      size="s"
      open={showDialog}
      onOpenChange={() => setShowDialog(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete posture
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="sm"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="error"
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected posture will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && <p className="">{fetcher.data?.message}</p>}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const DeleteScanConfirmationModal = ({
  open,
  onOpenChange,
  scanId,
}: {
  scanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const fetcher = useFetcher<ActionData>();
  const onDeleteScan = () => {
    const formData = new FormData();
    formData.append('actionType', ActionEnumType.DELETE_SCAN);
    formData.append('scanId', scanId);
    fetcher.submit(formData, {
      method: 'post',
    });
  };
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="s"
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete scan
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              color="error"
              onClick={(e) => {
                e.preventDefault();
                onDeleteScan();
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>
            Are you sure you want to delete this scan? This action cannot be undone.
          </span>
          {fetcher.data?.message && <p className="">{fetcher.data?.message}</p>}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="Scan deleted successfully!" />
      )}
    </Modal>
  );
};

const ScanHistory = () => {
  return (
    <div className="mx-4 mt-1.5 min-h-[36px] flex items-center">
      <span className="h-3.5 w-3.5 dark:text-text-input-value">
        <ClockLineIcon />
      </span>
      <span className="pl-2 pr-3 text-t3 dark:text-text-text-and-icon uppercase">
        scan time
      </span>
      <Suspense
        fallback={
          <div className="dark:text-text-text-and-icon text-p9">
            Fetching scan history...
          </div>
        }
      >
        <HistoryControls />
      </Suspense>
      <Button className="ml-auto" size="md">
        Start scan
      </Button>
    </div>
  );
};
const HistoryControls = () => {
  const { data } = useScanResults();
  const { nodeType } = useParams();
  const { scanStatusResult } = data;
  const { scan_id, node_id, node_type, updated_at, status } = scanStatusResult ?? {};
  const { navigate } = usePageNavigation();
  const { downloadScan } = useDownloadScan();

  const [scanIdToDelete, setScanIdToDelete] = useState<string | null>(null);

  const { data: historyData } = useSuspenseQuery({
    ...queries.posture.scanHistories({
      scanType: ScanTypeEnum.CloudComplianceScan,
      nodeId: node_id ?? '',
      nodeType: 'cloud_account',
    }),
  });

  if (!scan_id || !node_id || !node_type || !nodeType) {
    throw new Error('Scan Type, Node Type and Node Id are required');
  }
  if (!updated_at) {
    return null;
  }
  return (
    <div className="flex items-center gap-x-3">
      <ScanHistoryDropdown
        scans={[...(historyData?.data ?? [])].reverse().map((item) => ({
          id: item.scanId,
          isCurrent: item.scanId === scan_id,
          status: item.status,
          timestamp: formatMilliseconds(item.updatedAt),
          onDeleteClick: (id) => {
            setScanIdToDelete(id);
          },
          onDownloadClick: () => {
            downloadScan({
              scanId: item.scanId,
              scanType: UtilsReportFiltersScanTypeEnum.Compliance,
              nodeType: node_type as UtilsReportFiltersNodeTypeEnum,
            });
          },
          onScanClick: () => {
            navigate(
              generatePath(`/posture/cloud/scan-results/:nodeType/:scanId`, {
                scanId: encodeURIComponent(item.scanId),
                nodeType: nodeType,
              }),
              {
                replace: true,
              },
            );
          },
        }))}
        currentTimeStamp={formatMilliseconds(updated_at)}
      />

      {scanIdToDelete && (
        <DeleteScanConfirmationModal
          scanId={scanIdToDelete}
          open={!!scanIdToDelete}
          onOpenChange={(open) => {
            if (!open) setScanIdToDelete(null);
          }}
        />
      )}
      <div className="h-3 w-[1px] dark:bg-bg-grid-border"></div>
      <ScanStatusBadge status={status ?? ''} />
      <div className="h-3 w-[1px] dark:bg-bg-grid-border"></div>
      <div className="pl-1.5 flex">
        <IconButton
          variant="flat"
          icon={
            <span className="h-3 w-3">
              <DownloadLineIcon />
            </span>
          }
          size="md"
          onClick={() => {
            downloadScan({
              scanId: scan_id,
              scanType: UtilsReportFiltersScanTypeEnum.Vulnerability,
              nodeType: node_type as UtilsReportFiltersNodeTypeEnum,
            });
          }}
        />
        <IconButton
          variant="flat"
          icon={
            <span className="h-3 w-3">
              <TrashLineIcon />
            </span>
          }
          onClick={() => setScanIdToDelete(scan_id)}
        />
      </div>
    </div>
  );
};

const ActionDropdown = ({
  ids,
  trigger,
  setIdsToDelete,
  setShowDeleteDialog,
  onTableAction,
}: {
  ids: string[];
  trigger: React.ReactNode;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (ids: string[], actionType: string) => void;
}) => {
  return (
    <Dropdown
      triggerAsChild={true}
      align={'start'}
      content={
        <>
          <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.MASK)}>
            Mask
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.UNMASK)}>
            Un-mask
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.NOTIFY)}>
            Notify
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            onClick={() => {
              setIdsToDelete(ids);
              setShowDeleteDialog(true);
            }}
            className="dark:text-status-error dark:hover:text-[#C45268]"
          >
            Delete
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};
const BulkActions = ({
  ids,
  setIdsToDelete,
  setShowDeleteDialog,
  onTableAction,
}: {
  ids: string[];
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (ids: string[], actionType: string) => void;
}) => {
  return (
    <>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.MASK)}>
              Mask
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          startIcon={<EyeSolidIcon />}
          endIcon={<CaretDown />}
          disabled={!ids.length}
        >
          Mask
        </Button>
      </Dropdown>
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.UNMASK)}>
              Un-mask
            </DropdownItem>
          </>
        }
      >
        <Button
          color="default"
          variant="flat"
          size="sm"
          startIcon={<EyeHideSolid />}
          endIcon={<CaretDown />}
          disabled={!ids.length}
        >
          Unmask
        </Button>
      </Dropdown>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<BellLineIcon />}
        disabled={!ids.length}
        onClick={() => {
          onTableAction(ids, ActionEnumType.NOTIFY);
        }}
      >
        Notify
      </Button>
      <Button
        color="error"
        variant="flat"
        size="sm"
        startIcon={<TrashLineIcon />}
        disabled={!ids.length}
        onClick={() => {
          setIdsToDelete(ids);
          setShowDeleteDialog(true);
        }}
      >
        Delete
      </Button>
    </>
  );
};
const FILTER_SEARCHPARAMS: Record<string, string> = {
  visibility: 'Masked/Unmasked',
  status: 'Status',
  benchmarkType: 'Benchmark',
  services: 'Service',
};
const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [maskedQuery, setMaskedQuery] = useState('');
  const [statusQuery, setStatusQuery] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);
  const [benchmarkQuery, setBenchmarkQuery] = useState('');
  const [serviceQuery, setServiceQuery] = useState('');

  const params = useParams() as {
    nodeType: ComplianceScanNodeTypeEnum;
    scanId: string;
  };

  if (!params.scanId) {
    console.warn('No scan id found');
  }
  const {
    status,
    filters: { services, statuses },
  } = useGetCloudFilters(params.scanId);

  const benchmarks = complianceType[params.nodeType];

  return (
    <div className="px-4 py-2.5 mb-4 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['visibility']}
          multiple
          value={searchParams.getAll('visibility')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('visibility');
              values.forEach((value) => {
                prev.append('visibility', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setMaskedQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('visibility');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['masked', 'unmasked']
            .filter((item) => {
              if (!maskedQuery.length) return true;
              return item.toLowerCase().includes(maskedQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['status']}
          multiple
          value={searchParams.getAll('status')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('status');
              values.forEach((value) => {
                prev.append('status', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setStatusQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('status');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {statuses
            .filter((item) => {
              if (!statusQuery.length) return true;
              return item.toLowerCase().includes(statusQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['benchmarkType']}
          multiple
          value={searchParams.getAll('benchmarkType')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('benchmarkType');
              values.forEach((value) => {
                prev.append('benchmarkType', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setBenchmarkQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('benchmarkType');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {benchmarks
            .filter((item) => {
              if (!benchmarkQuery.length) return true;
              return item.toLowerCase().includes(benchmarkQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {item}
                </ComboboxOption>
              );
            })}
        </Combobox>
        <Combobox
          getDisplayValue={() => FILTER_SEARCHPARAMS['services']}
          multiple
          loading={status === 'loading'}
          value={searchParams.getAll('services')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('services');
              values.forEach((value) => {
                prev.append('services', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setServiceQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('services');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {services
            .filter((item) => {
              if (!serviceQuery.length) return true;
              return item.toLowerCase().includes(serviceQuery.toLowerCase());
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
const CloudPostureResults = () => {
  const [searchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const fetcher = useFetcher<ActionData>();

  const onTableAction = useCallback(
    (ids: string[], actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);

      ids.forEach((item) => formData.append('nodeIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher],
  );

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelectionState);
  }, [rowSelectionState]);

  return (
    <div className="self-start">
      <div className="py-2 flex items-center">
        <BulkActions
          ids={selectedIds}
          onTableAction={onTableAction}
          setIdsToDelete={setIdsToDelete}
          setShowDeleteDialog={setShowDeleteDialog}
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
      </div>
      {filtersExpanded ? <Filters /> : null}
      <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
        <CloudPostureTable
          onTableAction={onTableAction}
          setShowDeleteDialog={setShowDeleteDialog}
          setIdsToDelete={setIdsToDelete}
          rowSelectionState={rowSelectionState}
          setRowSelectionState={setRowSelectionState}
        />
      </Suspense>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          ids={idsToDelete}
          setShowDialog={setShowDeleteDialog}
          onDeleteSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
    </div>
  );
};
const CloudPostureTable = ({
  onTableAction,
  setIdsToDelete,
  setShowDeleteDialog,
  rowSelectionState,
  setRowSelectionState,
}: {
  onTableAction: (ids: string[], actionType: string) => void;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  rowSelectionState: RowSelectionState;
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useScanResults();
  const columnHelper = createColumnHelper<ModelCloudCompliance>();
  const [sort, setSort] = useSortingState();

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        minSize: 20,
        size: 20,
        maxSize: 20,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            ids={[cell.row.original.node_id]}
            setIdsToDelete={setIdsToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
            onTableAction={onTableAction}
            trigger={
              <button className="p-1">
                <div className="h-[16px] w-[16px] dark:text-text-text-and-icon rotate-90">
                  <EllipsisIcon />
                </div>
              </button>
            }
          />
        ),
        header: () => '',
        size: 25,
        minSize: 25,
        maxSize: 25,
        enableResizing: false,
      }),
      columnHelper.accessor('node_id', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => {
          return (
            <DFLink
              to={{
                pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
                search: searchParams.toString(),
              }}
              className="flex items-center gap-x-[6px]"
            >
              <div className="h-6 w-6 flex items-center justify-center bg-gray-100 shrink-0 dark:bg-[rgba(224,_81,_109,_0.2)] rounded-[5px]">
                <div className="w-3 h-3 dark:text-status-error">
                  <PostureIcon />
                </div>
              </div>
              <TruncatedText
                text={info.row.original.control_id ?? info.row.original.node_id}
              />
            </DFLink>
          );
        },
        header: () => 'ID',
        minSize: 80,
        size: 80,
        maxSize: 90,
      }),
      columnHelper.accessor('compliance_check_type', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => <TruncatedText text={info.getValue().toUpperCase()} />,
        header: () => 'Benchmark Type',
        minSize: 50,
        size: 60,
        maxSize: 65,
      }),
      columnHelper.accessor('service', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Service',
        minSize: 50,
        size: 60,
        maxSize: 65,
      }),
      columnHelper.accessor('status', {
        enableResizing: false,
        minSize: 60,
        size: 60,
        maxSize: 65,
        header: () => <div>Status</div>,
        cell: (info) => {
          return <PostureStatusBadge status={info.getValue() as PostureSeverityType} />;
        },
      }),
      columnHelper.accessor('description', {
        enableResizing: false,
        enableSorting: false,
        minSize: 140,
        size: 150,
        maxSize: 160,
        header: () => 'Description',
        cell: (info) => <TruncatedText text={info.getValue()} />,
      }),
    ];

    return columns;
  }, [setSearchParams]);

  const { data: scanResultData, scanStatusResult } = data;

  if (scanStatusResult?.status === ScanStatusEnum.error) {
    return <ScanStatusInError errorMessage={scanStatusResult.status_message} />;
  } else if (
    scanStatusResult?.status !== ScanStatusEnum.error &&
    scanStatusResult?.status !== ScanStatusEnum.complete
  ) {
    return <ScanStatusInProgress LogoIcon={PostureIcon} />;
  }
  if (!scanResultData) {
    return null;
  }

  return (
    <Table
      size="default"
      data={scanResultData.compliances}
      columns={columns}
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      enablePagination
      manualPagination
      approximatePagination
      enableColumnResizing
      totalRows={scanResultData.pagination.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={scanResultData.pagination.currentPage}
      enableSorting
      manualSorting
      sortingState={sort}
      getRowId={(row) => {
        return row.node_id;
      }}
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: scanResultData.pagination.currentPage,
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
      getTrProps={(row) => {
        if (row.original.masked) {
          return {
            className: 'opacity-40',
          };
        }
        return {};
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

const Header = () => {
  return (
    <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<PostureIcon />} isLink>
            <DFLink to={'/posture'} unstyled>
              Posture
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
  const { data } = useScanResults();
  const { scanStatusResult } = data;

  const { node_name } = scanStatusResult ?? {};
  const params = useParams() as {
    nodeType: string;
  };

  return (
    <>
      <BreadcrumbLink isLink icon={<PostureIcon />} asChild>
        <DFLink
          to={generatePath('/posture/accounts/:nodeType', {
            nodeType: params.nodeType,
          })}
          unstyled
        >
          {capitalize(providersToNameMapping[params.nodeType])}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink icon={<PostureIcon />} isLast>
        <span className="inherit cursor-auto">{node_name}</span>
      </BreadcrumbLink>
    </>
  );
};

const SeverityCountWidget = () => {
  const {
    data: { data },
  } = useScanResults();
  const statusCounts: {
    [k: string]: number;
  } = data?.statusCounts ?? {};
  const total = Object.values(statusCounts).reduce((acc, v) => {
    acc = acc + v;
    return acc;
  }, 0);

  return (
    <div className="grid grid-cols-12 px-6 items-center">
      <div className="col-span-2 h-[140px] w-[140px]">
        <PostureScanResultsPieChart
          data={statusCounts}
          color={[
            POSTURE_STATUS_COLORS['alarm'],
            POSTURE_STATUS_COLORS['info'],
            POSTURE_STATUS_COLORS['ok'],
            POSTURE_STATUS_COLORS['skip'],
            POSTURE_STATUS_COLORS['delete'],
          ]}
        />
      </div>
      <div className="col-span-2 dark:text-text-text-and-icon">
        <span className="text-p1">Total compliances</span>
        <div className="flex flex-1 max-w-[160px] gap-1 items-center">
          <TaskIcon />
          <span className="text-h1 dark:text-text-input">{abbreviateNumber(total)}</span>
        </div>
      </div>
      <div className="w-px min-h-[120px] dark:bg-bg-grid-border" />
      <div className="col-span-6">
        <div className="gap-24 flex justify-center">
          {Object.keys(statusCounts)?.map((key: string) => {
            return (
              <div key={key} className="col-span-2 dark:text-text-text-and-icon">
                <span className="text-p1">{capitalize(key)}</span>
                <div className="flex flex-1 max-w-[160px] gap-1 items-center">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor:
                        POSTURE_STATUS_COLORS[key.toLowerCase() as PostureSeverityType],
                    }}
                  ></div>
                  <span className="text-h1 dark:text-text-input-value">
                    {abbreviateNumber(statusCounts?.[key])}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Widgets = () => {
  return (
    <Card className="min-h-[140px] px-4 py-1.5">
      <div className="flex-1 pl-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[100px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <SeverityCountWidget />
        </Suspense>
      </div>
    </Card>
  );
};
const PostureCloudScanResults = () => {
  return (
    <>
      <Header />
      <ScanHistory />
      <div className="px-4 pb-4 pt-1.5">
        <Widgets />
      </div>

      <div className="px-4 pb-4">
        <CloudPostureResults />
      </div>
      <Outlet />
    </>
  );
};
export const module = {
  action,
  element: <PostureCloudScanResults />,
};
