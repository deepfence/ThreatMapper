import { useSuspenseQuery } from '@suspensive/react-query';
import { capitalize, keys, upperFirst } from 'lodash-es';
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
import { cn } from 'tailwind-preset';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  Checkbox,
  CircleSpinner,
  Combobox,
  ComboboxOption,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  getRowSelectionColumn,
  Modal,
  RowSelectionState,
  SortingState,
  Table,
  TableNoDataElement,
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient } from '@/api/api';
import {
  ModelScanInfo,
  ModelScanResultsMaskRequestMaskActionEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ModelSecret } from '@/api/generated/models/ModelSecret';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { CompareScanInputModal } from '@/components/forms/CompareScanInputModal';
import { BalanceLineIcon } from '@/components/icons/common/BalanceLine';
import { BellLineIcon } from '@/components/icons/common/BellLine';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { ClockLineIcon } from '@/components/icons/common/ClockLine';
import { DownloadLineIcon } from '@/components/icons/common/DownloadLine';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { EyeHideSolid } from '@/components/icons/common/EyeHideSolid';
import { EyeSolidIcon } from '@/components/icons/common/EyeSolid';
import { FilterIcon } from '@/components/icons/common/Filter';
import { TimesIcon } from '@/components/icons/common/Times';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { StopScanForm } from '@/components/scan-configure-forms/StopScanForm';
import { ScanHistoryDropdown } from '@/components/scan-history/HistoryList';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import {
  ScanStatusDeletePending,
  ScanStatusInError,
  ScanStatusInProgress,
  ScanStatusNoData,
  ScanStatusStopped,
  ScanStatusStopping,
} from '@/components/ScanStatusMessage';
import { SeverityBadgeIcon } from '@/components/SeverityBadge';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { TruncatedText } from '@/components/TruncatedText';
import { getSeverityColorMap } from '@/constants/charts';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { SelectNotificationChannel } from '@/features/integrations/components/SelectNotificationChannel';
import { SecretScanResultsPieChart } from '@/features/secrets/components/scan-results/SecretScanResultsPieChart';
import { SecretsCompare } from '@/features/secrets/components/scan-results/SecretsCompare';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { THEME_LIGHT, useTheme } from '@/theme/ThemeContext';
import {
  isCriticalSeverity,
  isHighSeverity,
  isLowSeverity,
  isMediumSeverity,
  isUnknownSeverity,
  ScanTypeEnum,
  SecretSeverityType,
} from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { abbreviateNumber } from '@/utils/number';
import {
  isScanComplete,
  isScanDeletePending,
  isScanFailed,
  isScanInProgress,
  isScanStopped,
  isScanStopping,
} from '@/utils/scan';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

enum ActionEnumType {
  MASK = 'mask',
  UNMASK = 'unmask',
  DELETE = 'delete',
  NOTIFY = 'notify',
  DELETE_SCAN = 'delete_scan',
}

const DEFAULT_PAGE_SIZE = 10;

type ActionData = {
  action: ActionEnumType;
  success: boolean;
  message?: string;
};

const action = async ({
  params: { scanId = '' },
  request,
}: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const ids = (formData.getAll('nodeIds[]') ?? []) as string[];
  const actionType = formData.get('actionType');
  const _scanId = scanId;
  const maskAction = formData.get('maskAction');
  if (!_scanId) {
    throw new Error('Scan ID is required');
  }

  if (actionType === ActionEnumType.DELETE || actionType === ActionEnumType.NOTIFY) {
    const notifyIndividual = formData.get('notifyIndividual')?.toString();
    const apiFunction =
      actionType === ActionEnumType.DELETE
        ? getScanResultsApiClient().deleteScanResult
        : getScanResultsApiClient().notifyScanResult;

    const apiFunctionApi = apiWrapper({
      fn: apiFunction,
    });
    const integrationIds = formData.getAll('integrationIds[]') as Array<string>;
    const result = await apiFunctionApi({
      modelScanResultsActionRequest: {
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.SecretScan,
        notify_individual: notifyIndividual === 'on',
        integration_ids:
          actionType === ActionEnumType.NOTIFY
            ? integrationIds.map((id) => Number(id))
            : null,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message } = await getResponseErrors(result.error);
        return {
          action: actionType,
          success: false,
          message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        if (actionType === ActionEnumType.DELETE) {
          return {
            action: actionType,
            success: false,
            message,
          };
        } else if (actionType === ActionEnumType.NOTIFY) {
          return {
            action: actionType,
            success: false,
            message,
          };
        }
      }
      throw result.error;
    }
    if (actionType === ActionEnumType.NOTIFY) {
      toast.success('Notified successfully');
    }
    invalidateAllQueries();
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.MASK || actionType === ActionEnumType.UNMASK) {
    const apiFunction =
      actionType === ActionEnumType.MASK
        ? getScanResultsApiClient().maskScanResult
        : getScanResultsApiClient().unmaskScanResult;
    const apiFunctionApi = apiWrapper({
      fn: apiFunction,
    });
    const result = await apiFunctionApi({
      modelScanResultsMaskRequest: {
        mask_action: maskAction as ModelScanResultsMaskRequestMaskActionEnum,
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.SecretScan,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message } = await getResponseErrors(result.error);
        return {
          action: actionType,
          success: false,
          message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        if (actionType === ActionEnumType.MASK) {
          toast.error(message);
          return {
            action: actionType,
            success: false,
            message,
          };
        } else if (actionType === ActionEnumType.UNMASK) {
          toast.error(message);
          return {
            action: actionType,
            success: false,
            message,
          };
        }
      }
      throw result.error;
    }
    if (actionType === ActionEnumType.MASK) {
      toast.success('Masked successfully');
    } else if (actionType === ActionEnumType.UNMASK) {
      toast.success('Unmasked successfully');
    }
    invalidateAllQueries();
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.DELETE_SCAN) {
    const deleteScan = apiWrapper({
      fn: getScanResultsApiClient().deleteScanResultsForScanID,
    });

    const result = await deleteScan({
      scanId: formData.get('scanId') as string,
      scanType: ScanTypeEnum.SecretScan,
    });

    if (!result.ok) {
      if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          action: actionType,
          success: false,
          message,
        };
      }
      throw result.error;
    }
    return {
      action: actionType,
      success: true,
    };
  } else {
    throw new Error('Unknown action type.');
  }
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  visibility: 'Masked/Unmasked',
  severity: 'Severity',
};
const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};

export const useScanResults = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const scanId = params?.scanId ?? '';
  return useSuspenseQuery({
    ...queries.secret.scanResults({
      scanId,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'level',
        descending: true,
      },
      rules: searchParams.getAll('rules'),
      severity: searchParams.getAll('severity'),
      visibility: searchParams.getAll('visibility'),
    }),
    keepPreviousData: true,
  });
};
const useTop5Secrets = () => {
  const params = useParams();
  const scanId = params?.scanId ?? '';
  return useSuspenseQuery({
    ...queries.secret.top5SecretsForScan({
      scanId,
    }),
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
          <div className="flex gap-3 items-center text-status-error">
            <span className="h-6 w-6 shrink-0">
              <ErrorStandardLineIcon />
            </span>
            Delete {ids.length > 1 ? 'secrets' : 'secret'}
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => setShowDialog(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              color="error"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
              }}
            >
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected secrets will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
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
  onOpenChange: (open: boolean, deleteSuccessful: boolean) => void;
}) => {
  const [deleteSuccessful, setDeleteSuccessful] = useState(false);
  const fetcher = useFetcher<ActionData>();
  const onDeleteScan = () => {
    const formData = new FormData();
    formData.append('actionType', ActionEnumType.DELETE_SCAN);
    formData.append('scanId', scanId);
    fetcher.submit(formData, {
      method: 'post',
    });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      setDeleteSuccessful(true);
    }
  }, [fetcher]);

  return (
    <Modal
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open, deleteSuccessful);
      }}
      size="s"
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-status-error">
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
              size="md"
              onClick={() => onOpenChange(false, deleteSuccessful)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              color="error"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                onDeleteScan();
              }}
            >
              Delete
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
          {fetcher.data?.message && (
            <p className="text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
          <div className="flex items-center justify-right gap-4"></div>
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const NotifyModal = ({
  open,
  ids,
  closeModal,
}: {
  open: boolean;
  ids: string[];
  closeModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  return (
    <Modal
      size="s"
      open={open}
      onOpenChange={() => closeModal(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center text-text-text-and-icon">
            <span className="h-6 w-6 shrink-0">
              <BellLineIcon />
            </span>
            Notify secrets
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <fetcher.Form method="post">
          <input
            type="text"
            name="actionType"
            hidden
            readOnly
            value={ActionEnumType.NOTIFY}
          />
          {ids.map((id) => (
            <input key={id} type="text" name="nodeIds[]" hidden readOnly value={id} />
          ))}

          <div className="grid">
            <span>The selected secrets will be notified.</span>
            <br />
            <SelectNotificationChannel />
            <br />
            {ids.length > 1 ? (
              <>
                <span>Do you want to notify each secret separately?</span>
                <div className="mt-2">
                  <Checkbox label="Yes notify them separately" name="notifyIndividual" />
                </div>
              </>
            ) : null}
            {fetcher.data?.message && (
              <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
            )}
          </div>
          <div className={'flex gap-x-3 justify-end pt-3 mx-2'}>
            <Button
              size="md"
              onClick={() => closeModal(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              type="submit"
            >
              Notify
            </Button>
          </div>
        </fetcher.Form>
      ) : (
        <SuccessModalContent text="Notified successfully!" />
      )}
    </Modal>
  );
};

const ScanHistory = () => {
  return (
    <div className="flex items-center h-12">
      <span className="h-3.5 w-3.5 text-text-input-value">
        <ClockLineIcon />
      </span>
      <span className="pl-2 pr-3 text-t3 text-text-text-and-icon uppercase">
        scan time
      </span>
      <Suspense
        fallback={
          <div className="text-text-text-and-icon text-p9">Fetching scan history...</div>
        }
      >
        <HistoryControls />
      </Suspense>
    </div>
  );
};

const HistoryControls = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data, fetchStatus } = useScanResults();
  const { scanStatusResult } = data;
  const { scan_id, node_id, node_type, created_at, status } = scanStatusResult ?? {};
  const { navigate, goBack } = usePageNavigation();
  const { downloadScan } = useDownloadScan((state) => {
    setIsSubmitting(state === 'submitting');
  });
  const [openStopScanModal, setOpenStopScanModal] = useState(false);

  const [showScanCompareModal, setShowScanCompareModal] = useState<boolean>(false);

  const [scanIdToDelete, setScanIdToDelete] = useState<string | null>(null);

  const [compareInput, setCompareInput] = useState<{
    baseScanId: string;
    toScanId: string;
    baseScanTime: number;
    toScanTime: number;
    showScanTimeModal: boolean;
  }>({
    baseScanId: '',
    toScanId: '',
    baseScanTime: created_at ?? 0,
    toScanTime: 0,
    showScanTimeModal: false,
  });

  const { data: historyData, refetch } = useSuspenseQuery({
    ...queries.common.scanHistories({
      nodeId: node_id ?? '',
      nodeType: node_type ?? '',
      size: Number.MAX_SAFE_INTEGER,
      scanType: ScanTypeEnum.SecretScan,
    }),
  });

  useEffect(() => {
    refetch();
  }, [scan_id]);

  if (!scan_id || !node_id || !node_type) {
    throw new Error('Scan Type, Node Type and Node Id are required');
  }
  if (!created_at) {
    return null;
  }
  const onCompareScanClick = (baseScanTime: number) => {
    setCompareInput({
      ...compareInput,
      baseScanTime,
      showScanTimeModal: true,
    });
  };

  return (
    <div className="flex items-center relative flex-grow gap-4">
      {openStopScanModal && (
        <StopScanForm
          open={openStopScanModal}
          closeModal={setOpenStopScanModal}
          scanIds={[scan_id]}
          scanType={ScanTypeEnum.SecretScan}
        />
      )}
      {compareInput.showScanTimeModal && (
        <CompareScanInputModal
          showDialog={true}
          setShowDialog={() => {
            setCompareInput((input) => {
              return {
                ...input,
                showScanTimeModal: false,
              };
            });
          }}
          setShowScanCompareModal={setShowScanCompareModal}
          scanHistoryData={historyData.data}
          setCompareInput={setCompareInput}
          compareInput={compareInput}
          nodeId={node_id}
          nodeType={node_type}
          scanType={ScanTypeEnum.SecretScan}
        />
      )}
      {showScanCompareModal && (
        <SecretsCompare
          open={showScanCompareModal}
          onOpenChange={setShowScanCompareModal}
          compareInput={compareInput}
        />
      )}
      <div className="flex items-center gap-x-3">
        <ScanHistoryDropdown
          scans={[...(historyData?.data ?? [])].reverse().map((item) => ({
            id: item.scanId,
            isCurrent: item.scanId === scan_id,
            status: item.status,
            timestamp: item.createdAt,
            showScanCompareButton: true,
            onScanTimeCompareButtonClick: onCompareScanClick,
            onDeleteClick: (id) => {
              setScanIdToDelete(id);
            },
            onDownloadClick: () => {
              downloadScan({
                scanId: item.scanId,
                scanType: UtilsReportFiltersScanTypeEnum.Secret,
                nodeType: node_type as UtilsReportFiltersNodeTypeEnum,
              });
            },
            onScanClick: () => {
              navigate(
                generatePath('/secret/scan-results/:scanId', {
                  scanId: encodeURIComponent(item.scanId),
                }),
                {
                  replace: true,
                },
              );
            },
          }))}
          currentTimeStamp={formatMilliseconds(created_at)}
        />

        {scanIdToDelete && (
          <DeleteScanConfirmationModal
            scanId={scanIdToDelete}
            open={!!scanIdToDelete}
            onOpenChange={(open, deleteSuccessful) => {
              if (!open) {
                if (deleteSuccessful && scanIdToDelete === scan_id) {
                  const latestScan = [...historyData.data].reverse().find((scan) => {
                    return scan.scanId !== scanIdToDelete;
                  });
                  if (latestScan) {
                    navigate(
                      generatePath('/secret/scan-results/:scanId', {
                        scanId: encodeURIComponent(latestScan.scanId),
                      }),
                      { replace: true },
                    );
                  } else {
                    goBack();
                  }
                }
                setScanIdToDelete(null);
              }
            }}
          />
        )}
        <div className="h-3 w-[1px] dark:bg-bg-grid-border bg-bg-border-form"></div>
        <ScanStatusBadge status={status ?? ''} className="text-p1" />
        {!isScanInProgress(status ?? '') && !isScanDeletePending(status ?? '') ? (
          <>
            <div className="h-3 w-[1px] dark:bg-bg-grid-border bg-bg-border-form"></div>
            <div className="flex">
              <Button
                variant="flat"
                startIcon={
                  <span className="h-3 w-3">
                    <DownloadLineIcon />
                  </span>
                }
                disabled={fetchStatus !== 'idle' || isSubmitting}
                loading={isSubmitting}
                size="md"
                onClick={() => {
                  downloadScan({
                    scanId: scan_id,
                    scanType: UtilsReportFiltersScanTypeEnum.Secret,
                    nodeType: node_type as UtilsReportFiltersNodeTypeEnum,
                  });
                }}
              >
                Download
              </Button>
              <Button
                variant="flat"
                startIcon={
                  <span className="h-3 w-3">
                    <TrashLineIcon />
                  </span>
                }
                disabled={fetchStatus !== 'idle'}
                onClick={() => setScanIdToDelete(scan_id)}
              >
                Delete
              </Button>
              <>
                {isScanComplete(status ?? '') && (
                  <Button
                    variant="flat"
                    startIcon={
                      <span className="h-3 w-3">
                        <BalanceLineIcon />
                      </span>
                    }
                    disabled={fetchStatus !== 'idle'}
                    onClick={() => {
                      setCompareInput({
                        ...compareInput,
                        baseScanTime: created_at ?? 0,
                        showScanTimeModal: true,
                      });
                    }}
                  >
                    Compare scan
                  </Button>
                )}
              </>
            </div>
          </>
        ) : (
          <>
            {!isScanDeletePending(status ?? '') ? (
              <Button
                type="button"
                variant="flat"
                size="sm"
                className="absolute right-0 top-0"
                onClick={(e) => {
                  e.preventDefault();
                  setOpenStopScanModal(true);
                }}
              >
                Cancel scan
              </Button>
            ) : null}
          </>
        )}
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
  nodeType,
  isDockerImageNameEmpty,
}: {
  ids: string[];
  trigger: React.ReactNode;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (
    ids: string[],
    actionType: string,
    maskAction?: ModelScanResultsMaskRequestMaskActionEnum,
  ) => void;
  nodeType: string;
  isDockerImageNameEmpty: boolean;
}) => {
  const isHost = nodeType === 'host';
  const [openNotifyModal, setOpenNotifyModal] = useState<boolean>(false);
  return (
    <>
      {openNotifyModal && (
        <NotifyModal open={true} closeModal={setOpenNotifyModal} ids={ids} />
      )}
      <Dropdown
        triggerAsChild={true}
        align={'start'}
        content={
          <>
            {isHost ? (
              <DropdownItem
                onClick={() =>
                  onTableAction(
                    ids,
                    ActionEnumType.MASK,
                    ModelScanResultsMaskRequestMaskActionEnum.Entity,
                  )
                }
              >
                Mask secret for this host
              </DropdownItem>
            ) : (
              <>
                {!isDockerImageNameEmpty && (
                  <>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.MASK,
                          ModelScanResultsMaskRequestMaskActionEnum.ImageTag,
                        )
                      }
                    >
                      Mask secret for this image tag
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.MASK,
                          ModelScanResultsMaskRequestMaskActionEnum.AllImageTag,
                        )
                      }
                    >
                      Mask secret for this image(all tags)
                    </DropdownItem>
                  </>
                )}
              </>
            )}
            <DropdownItem
              onClick={() =>
                onTableAction(
                  ids,
                  ActionEnumType.MASK,
                  ModelScanResultsMaskRequestMaskActionEnum.Global,
                )
              }
            >
              Mask secret across hosts and images
            </DropdownItem>
            <DropdownSeparator />
            {isHost ? (
              <DropdownItem
                onClick={() =>
                  onTableAction(
                    ids,
                    ActionEnumType.UNMASK,
                    ModelScanResultsMaskRequestMaskActionEnum.Entity,
                  )
                }
              >
                Un-mask secret for this host
              </DropdownItem>
            ) : (
              <>
                {!isDockerImageNameEmpty && (
                  <>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.UNMASK,
                          ModelScanResultsMaskRequestMaskActionEnum.ImageTag,
                        )
                      }
                    >
                      Un-mask secret for this image tag
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.UNMASK,
                          ModelScanResultsMaskRequestMaskActionEnum.AllImageTag,
                        )
                      }
                    >
                      Un-mask secret for this image(all tags)
                    </DropdownItem>
                  </>
                )}
              </>
            )}
            <DropdownItem
              onClick={() =>
                onTableAction(
                  ids,
                  ActionEnumType.UNMASK,
                  ModelScanResultsMaskRequestMaskActionEnum.Global,
                )
              }
            >
              Un-mask secret across hosts and images
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              onClick={() => {
                setOpenNotifyModal(true);
              }}
            >
              Notify
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              onClick={() => {
                setIdsToDelete(ids);
                setShowDeleteDialog(true);
              }}
              color="error"
            >
              Delete
            </DropdownItem>
          </>
        }
      >
        {trigger}
      </Dropdown>
    </>
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
  onTableAction: (
    ids: string[],
    actionType: string,
    maskAction?: ModelScanResultsMaskRequestMaskActionEnum,
  ) => void;
}) => {
  const [openNotifyModal, setOpenNotifyModal] = useState<boolean>(false);

  const { data } = useScanResults();
  const { scanStatusResult, data: scanResults } = data;

  const isHost = scanStatusResult?.node_type === 'host';
  const isDockerImageNameEmpty = scanResults?.dockerImageName?.trim()?.length === 0;

  return (
    <>
      {openNotifyModal && (
        <NotifyModal open={true} closeModal={setOpenNotifyModal} ids={ids} />
      )}
      <Dropdown
        triggerAsChild
        align={'start'}
        disabled={!ids.length}
        content={
          <>
            {isHost ? (
              <DropdownItem
                onClick={() =>
                  onTableAction(
                    ids,
                    ActionEnumType.MASK,
                    ModelScanResultsMaskRequestMaskActionEnum.Entity,
                  )
                }
              >
                Mask secrets for this host
              </DropdownItem>
            ) : (
              <>
                {!isDockerImageNameEmpty && (
                  <>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.MASK,
                          ModelScanResultsMaskRequestMaskActionEnum.ImageTag,
                        )
                      }
                    >
                      Mask secrets for this image tag
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.MASK,
                          ModelScanResultsMaskRequestMaskActionEnum.AllImageTag,
                        )
                      }
                    >
                      Mask secrets for this image(all tags)
                    </DropdownItem>
                  </>
                )}
              </>
            )}
            <DropdownItem
              onClick={() =>
                onTableAction(
                  ids,
                  ActionEnumType.MASK,
                  ModelScanResultsMaskRequestMaskActionEnum.Global,
                )
              }
            >
              Mask secrets across hosts and images
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
            {isHost ? (
              <DropdownItem
                onClick={() =>
                  onTableAction(
                    ids,
                    ActionEnumType.UNMASK,
                    ModelScanResultsMaskRequestMaskActionEnum.Entity,
                  )
                }
              >
                Un-mask secrets for this host
              </DropdownItem>
            ) : (
              <>
                {!isDockerImageNameEmpty && (
                  <>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.UNMASK,
                          ModelScanResultsMaskRequestMaskActionEnum.ImageTag,
                        )
                      }
                    >
                      Un-mask secrets for this image tag
                    </DropdownItem>
                    <DropdownItem
                      onClick={() =>
                        onTableAction(
                          ids,
                          ActionEnumType.UNMASK,
                          ModelScanResultsMaskRequestMaskActionEnum.AllImageTag,
                        )
                      }
                    >
                      Un-mask secrets for this image(all tags)
                    </DropdownItem>
                  </>
                )}
              </>
            )}
            <DropdownItem
              onClick={() =>
                onTableAction(
                  ids,
                  ActionEnumType.UNMASK,
                  ModelScanResultsMaskRequestMaskActionEnum.Global,
                )
              }
            >
              Un-mask secrets across hosts and images
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
        variant="flat"
        size="sm"
        startIcon={<BellLineIcon />}
        disabled={!ids.length}
        onClick={() => {
          setOpenNotifyModal(true);
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

const Filters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [maskedQuery, setMaskedQuery] = useState('');
  const [severityQuery, setSeverityQuery] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <FilterWrapper>
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
              return item.includes(maskedQuery.toLowerCase());
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
          getDisplayValue={() => FILTER_SEARCHPARAMS['severity']}
          multiple
          value={searchParams.getAll('severity')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('severity');
              values.forEach((value) => {
                prev.append('severity', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onQueryChange={(query) => {
            setSeverityQuery(query);
          }}
          clearAllElement="Clear"
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('severity');
              prev.delete('page');
              return prev;
            });
          }}
        >
          {['critical', 'high', 'medium', 'low', 'unknown']
            .filter((item) => {
              if (!severityQuery.length) return true;
              return item.includes(severityQuery.toLowerCase());
            })
            .map((item) => {
              return (
                <ComboboxOption key={item} value={item}>
                  {capitalize(item)}
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
const TablePlaceholder = ({
  scanStatus,
  message,
}: {
  scanStatus: string;
  message: string;
}) => {
  if (isScanFailed(scanStatus)) {
    return (
      <div className="flex items-center justify-center min-h-[384px]">
        <ScanStatusInError errorMessage={message} />
      </div>
    );
  }
  if (isScanStopped(scanStatus)) {
    return (
      <div className="flex items-center justify-center h-[384px]">
        <ScanStatusStopped errorMessage={message ?? ''} />
      </div>
    );
  }
  if (isScanStopping(scanStatus)) {
    return (
      <div className="flex items-center justify-center h-[384px]">
        <ScanStatusStopping />
      </div>
    );
  }
  if (isScanInProgress(scanStatus)) {
    return (
      <div className="flex items-center justify-center min-h-[384px]">
        <ScanStatusInProgress />
      </div>
    );
  }
  if (isScanDeletePending(scanStatus)) {
    return (
      <div className="flex items-center justify-center min-h-[384px]">
        <ScanStatusDeletePending />
      </div>
    );
  }

  return <TableNoDataElement text="No data available" />;
};
const SecretTable = ({
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
  const { mode: theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useScanResults();
  const { data: scanResultData, scanStatusResult } = data;
  const columnHelper = createColumnHelper<ModelSecret>();
  const [sort, setSort] = useSortingState();

  const nodeType = scanStatusResult?.node_type ?? '';
  const isDockerImageNameEmpty = scanResultData?.dockerImageName?.trim()?.length === 0;

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 40,
        minSize: 40,
        maxSize: 40,
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
            nodeType={nodeType}
            isDockerImageNameEmpty={isDockerImageNameEmpty}
            trigger={
              <button className="p-1">
                <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
                  <EllipsisIcon />
                </div>
              </button>
            }
          />
        ),
        header: () => '',
        size: 45,
        minSize: 40,
        maxSize: 55,
        enableResizing: false,
      }),
      columnHelper.accessor('node_id', {
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
              search: searchParams.toString(),
            }}
            className="flex items-center gap-x-[6px]"
          >
            <div className="w-4 h-4 shrink-0 text-text-text-and-icon">
              <SecretsIcon />
            </div>
            <TruncatedText text={info.row.original.name ?? info.getValue() ?? ''} />
          </DFLink>
        ),
        header: () => 'Name',
        minSize: 80,
        size: 100,
        maxSize: 130,
      }),
      columnHelper.accessor('full_filename', {
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => <TruncatedText text="File name" />,
        minSize: 100,
        size: 110,
        maxSize: 140,
      }),
      columnHelper.accessor('matched_content', {
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Matched content',
        minSize: 130,
        size: 140,
        maxSize: 165,
      }),
      columnHelper.accessor('level', {
        cell: (info) => (
          <div className="text-p4 text-text-text-and-icon gap-1 inline-flex">
            <SeverityBadgeIcon
              severity={info.getValue() as SecretSeverityType}
              theme={theme}
            />
            {upperFirst(info.getValue())}
          </div>
        ),
        header: () => 'Severity',
        minSize: 30,
        size: 50,
        maxSize: 70,
      }),
      columnHelper.accessor('signature_to_match', {
        enableSorting: false,
        cell: (info) => {
          return <TruncatedText text={info.getValue()} />;
        },
        header: () => <TruncatedText text="Signature to match" />,
        minSize: 70,
        size: 100,
        maxSize: 150,
      }),
      columnHelper.accessor('resources', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => {
          return <TruncatedText text={info.getValue()?.join(', ') ?? ''} />;
        },
        header: () => <TruncatedText text="Affected resources" />,
        minSize: 100,
        size: 120,
        maxSize: 190,
      }),
      columnHelper.accessor('part', {
        enableSorting: false,
        enableResizing: true,
        cell: (info) => <TruncatedText text={info.getValue() || '-'} />,
        header: () => <TruncatedText text="Part" />,
        minSize: 40,
        size: 50,
        maxSize: 70,
      }),
    ];

    return columns;
  }, [setSearchParams, nodeType, theme]);

  return (
    <Table
      size="default"
      data={scanResultData?.tableData ?? []}
      columns={columns}
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      enablePagination
      manualPagination
      enableColumnResizing
      approximatePagination
      totalRows={scanResultData?.pagination?.totalRows}
      pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
      pageIndex={scanResultData?.pagination?.currentPage}
      getRowId={(row) => `${row.node_id}`}
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
      onPaginationChange={(updaterOrValue) => {
        let newPageIndex = 0;
        if (typeof updaterOrValue === 'function') {
          newPageIndex = updaterOrValue({
            pageIndex: scanResultData?.pagination?.currentPage ?? 0,
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
      noDataElement={
        <TablePlaceholder
          scanStatus={scanStatusResult?.status ?? ''}
          message={scanStatusResult?.status_message ?? ''}
        />
      }
      getTdProps={(cell) => {
        const severity = cell.row.original.level;
        return {
          className: cn(
            'relative',
            'first:before:content-[""]',
            'first:before:absolute',
            'first:before:h-full',
            'first:before:w-1',
            'first:before:left-0',
            'first:before:top-px',
            {
              'first:before:bg-severity-critical': isCriticalSeverity(severity),
              'first:before:bg-severity-high': isHighSeverity(severity),
              'first:before:bg-severity-medium': isMediumSeverity(severity),
              'first:before:bg-severity-low': isLowSeverity(severity),
              'first:before:bg-severity-unknown': isUnknownSeverity(severity),
            },
          ),
        };
      }}
    />
  );
};

const Header = () => {
  return (
    <BreadcrumbWrapper>
      <>
        <Breadcrumb>
          <BreadcrumbLink asChild icon={<SecretsIcon />} isLink>
            <DFLink to={'/secret'} unstyled>
              Secrets
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

const DynamicBreadcrumbs = () => {
  const { data } = useScanResults();
  const { scanStatusResult } = data;

  const { node_type, node_name } = scanStatusResult ?? {};
  let nodeType = node_type;
  if (node_type === 'image') {
    nodeType = 'container_image';
  }

  return (
    <>
      <BreadcrumbLink isLink asChild>
        <DFLink to={`/secret/scans?nodeType=${nodeType}`} unstyled>
          {capitalize(nodeType?.replace('_', ' ') ?? '')}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink isLast>
        <span className="inherit cursor-auto">{node_name}</span>
      </BreadcrumbLink>
    </>
  );
};

const ScanResults = () => {
  const [searchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const fetcher = useFetcher<ActionData>();

  const onTableAction = useCallback(
    (
      ids: string[],
      actionType: string,
      maskAction?: ModelScanResultsMaskRequestMaskActionEnum,
    ) => {
      const formData = new FormData();
      formData.append('actionType', actionType);

      if (actionType === ActionEnumType.MASK || actionType === ActionEnumType.UNMASK) {
        formData.append('maskAction', maskAction?.toString() ?? '');
      }

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
      <div className="mt-4 h-12 flex items-center">
        <Suspense>
          <BulkActions
            ids={selectedIds}
            onTableAction={onTableAction}
            setIdsToDelete={setIdsToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
          />
        </Suspense>
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
      <div className="dark:shadow-none shadow-md">
        <Suspense fallback={<TableSkeleton columns={7} rows={10} />}>
          <SecretTable
            onTableAction={onTableAction}
            setShowDeleteDialog={setShowDeleteDialog}
            setIdsToDelete={setIdsToDelete}
            rowSelectionState={rowSelectionState}
            setRowSelectionState={setRowSelectionState}
          />
        </Suspense>
      </div>
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

const SeverityCounts = ({
  severityCounts,
}: {
  severityCounts: {
    [k: string]: number;
  };
}) => {
  const { mode } = useTheme();
  const [, setSearchParams] = useSearchParams();

  return (
    <>
      {Object.keys(severityCounts)?.map((key) => {
        return (
          <div className="flex gap-x-2 w-full items-center" key={key}>
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor:
                  getSeverityColorMap(mode)[key.toLowerCase() as SecretSeverityType],
              }}
            ></div>
            <button
              className="capitalize text-p4 text-text-icon"
              onClick={() => {
                setSearchParams((prev) => {
                  prev.delete('page');
                  Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                    prev.delete(key);
                  });
                  prev.append('severity', key.toLowerCase());
                  return prev;
                });
              }}
            >
              {key}
            </button>
            <div className="ml-auto text-p11 text-text-input-value">
              {abbreviateNumber(severityCounts?.[key] ?? 0)}
            </div>
          </div>
        );
      })}
    </>
  );
};
const ScanStatusWrapper = ({
  children,
  scanStatusResult,
  displayNoData,
}: {
  children: React.ReactNode;
  scanStatusResult: ModelScanInfo | undefined;
  displayNoData?: boolean;
}) => {
  if (isScanFailed(scanStatusResult?.status ?? '')) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusInError errorMessage={scanStatusResult?.status_message ?? ''} />
      </div>
    );
  }

  if (isScanStopped(scanStatusResult?.status ?? '')) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusStopped errorMessage={scanStatusResult?.status_message ?? ''} />
      </div>
    );
  }

  if (isScanStopping(scanStatusResult?.status ?? '')) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusStopping />
      </div>
    );
  }

  if (isScanInProgress(scanStatusResult?.status ?? '')) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusInProgress />
      </div>
    );
  }
  if (isScanDeletePending(scanStatusResult?.status ?? '')) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusDeletePending />
      </div>
    );
  }
  if (displayNoData) {
    return (
      <div className="flex items-center justify-center h-[140px]">
        <ScanStatusNoData />
      </div>
    );
  }

  return <>{children}</>;
};

const SeverityCountWidget = () => {
  const {
    data: { data, scanStatusResult },
  } = useScanResults();

  const severityCounts: {
    [k: string]: number;
  } = data?.severityCounts ?? {};

  const [, setSearchParams] = useSearchParams();

  return (
    <ScanStatusWrapper scanStatusResult={scanStatusResult}>
      <div className="flex items-center">
        <div className="h-[140px] w-[140px]">
          <SecretScanResultsPieChart
            data={severityCounts}
            onChartClick={({ name }: { name: string; value: string | number | Date }) => {
              setSearchParams((prev) => {
                prev.delete('page');
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.append('severity', name.toLowerCase());
                return prev;
              });
            }}
          />
        </div>
        <div className="flex flex-1 justify-center">
          <div className="flex flex-col flex-1 max-w-[160px]">
            {keys(severityCounts).length === 0 ? (
              <div className="flex flex-col flex-1">
                <ScanStatusNoData />
              </div>
            ) : (
              <div className="flex flex-col flex-1 max-w-[160px] gap-y-[6px]">
                <SeverityCounts severityCounts={severityCounts} />
              </div>
            )}
          </div>
        </div>
      </div>
    </ScanStatusWrapper>
  );
};

const Top5Widget = () => {
  const { mode: theme } = useTheme();
  const { data } = useTop5Secrets();
  const [searchParams] = useSearchParams();

  const { data: scanResult } = useScanResults();
  const { scanStatusResult } = scanResult;

  return (
    <ScanStatusWrapper
      scanStatusResult={scanStatusResult}
      displayNoData={!data.data || data.data?.length === 0}
    >
      <table className="table-fixed w-full">
        <tbody>
          {data.data?.map?.((secret) => {
            return (
              <tr key={secret.node_id}>
                <td className="w-[80%] px-0 pt-0 pb-1">
                  <div className="flex gap-x-[8px] items-center">
                    <div
                      className={cn('w-[3px] h-[18px] rounded shrink-0', {
                        'bg-severity-critical': secret.level === 'critical',
                        'bg-severity-high': secret.level === 'high',
                        'bg-severity-medium': secret.level === 'medium',
                        'bg-severity-low': secret.level === 'low',
                        'bg-severity-unknown':
                          !secret.level || secret.level === 'unknown',
                      })}
                    ></div>
                    <div className="w-[14px] h-[14px] shrink-0">
                      <SecretsIcon />
                    </div>
                    <DFLink
                      to={{
                        pathname: `./${encodeURIComponent(secret.node_id)}`,
                        search: searchParams.toString(),
                      }}
                      className="flex items-center min-w-0"
                    >
                      <div className="text-p7 truncate">
                        <TruncatedText text={secret.name} />
                      </div>
                    </DFLink>
                  </div>
                </td>
                <td className="w-[20%] px-0 pt-0 pb-1 pl-1">
                  <div className="flex gap-1">
                    <SeverityBadgeIcon
                      severity={secret.level as SecretSeverityType}
                      theme={theme}
                    />
                    <span className="text-p4 text-text-text-and-icon">
                      {upperFirst(secret.level)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScanStatusWrapper>
  );
};
const TopAttackPath = () => {
  const { mode } = useTheme();
  const { data: scanResult } = useScanResults();
  const { scanStatusResult } = scanResult;

  return (
    <ScanStatusWrapper scanStatusResult={scanStatusResult}>
      <div
        className={cn(
          'h-full w-full relative select-none flex items-center justify-center',
          {
            'bg-[#F5F5F5]/50': mode === THEME_LIGHT,
          },
        )}
      >
        <ScanStatusNoData />
      </div>
    </ScanStatusWrapper>
  );
};
const Widgets = () => {
  return (
    <div className="grid grid-cols-3 gap-4 min-h-[200px]">
      <Card className="px-4 py-1.5 flex flex-col">
        <div className="text-h6 text-text-input-value py-1">Total secrets</div>
        <div className="mt-2 flex-1 pl-4">
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
      <Card className="px-4 py-1.5 flex flex-col">
        <div className="text-h6 text-text-input-value py-1">Top 5 secrets</div>
        <div className="mt-2 flex-1">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[100px]">
                <CircleSpinner size="md" />
              </div>
            }
          >
            <Top5Widget />
          </Suspense>
        </div>
      </Card>
      <Card className="px-4 py-1.5 flex flex-col">
        <div className="text-h6 text-text-input-value py-1">Top attack paths</div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[100px]">
              <CircleSpinner size="md" />
            </div>
          }
        >
          <TopAttackPath />
        </Suspense>
      </Card>
    </div>
  );
};

const SecretScanResults = () => {
  return (
    <>
      <Header />
      <div className="mx-4">
        <ScanHistory />
        <Widgets />
        <ScanResults />
        <Outlet />
      </div>
    </>
  );
};

export const module = {
  action,
  element: <SecretScanResults />,
};
