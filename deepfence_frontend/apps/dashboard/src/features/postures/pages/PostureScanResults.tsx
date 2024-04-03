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
  ModelCompliance,
  ModelScanInfo,
  ModelScanResultsMaskRequestMaskActionEnum,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
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
import { TaskIcon } from '@/components/icons/common/Task';
import { TimesIcon } from '@/components/icons/common/Times';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
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
import { PostureStatusBadgeIcon } from '@/components/SeverityBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { BreadcrumbWrapper } from '@/features/common/BreadcrumbWrapper';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { FilterWrapper } from '@/features/common/FilterWrapper';
import { SelectNotificationChannel } from '@/features/integrations/components/SelectNotificationChannel';
import { PostureScanResultsPieChart } from '@/features/postures/components/scan-result/PostureScanResultsPieChart';
import { PosturesCompare } from '@/features/postures/components/scan-result/PosturesCompare';
import { SearchablePostureTestNumber } from '@/features/postures/components/scan-result/SearchableTestNumber';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { useTheme } from '@/theme/ThemeContext';
import {
  ComplianceScanNodeTypeEnum,
  isAlarmStatus,
  isDeleteStatus,
  isInfoStatus,
  isNoteStatus,
  isOkStatus,
  isPassStatus,
  isSkipStatus,
  isWarnStatus,
  PostureSeverityType,
  ScanTypeEnum,
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

const DEFAULT_PAGE_SIZE = 10;

enum ActionEnumType {
  MASK = 'mask',
  UNMASK = 'unmask',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  NOTIFY = 'notify',
  DELETE_SCAN = 'delete_scan',
}

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
  if (!_scanId) {
    throw new Error('Scan ID is required');
  }

  if (actionType === ActionEnumType.DELETE || actionType === ActionEnumType.NOTIFY) {
    const notifyIndividual = formData.get('notifyIndividual')?.toString();
    const apiFunction =
      actionType === ActionEnumType.DELETE
        ? getScanResultsApiClient().deleteScanResult
        : getScanResultsApiClient().notifyScanResult;
    const resultApi = apiWrapper({
      fn: apiFunction,
    });
    const integrationIds = formData.getAll('integrationIds[]') as Array<string>;
    const result = await resultApi({
      modelScanResultsActionRequest: {
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.ComplianceScan,
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
    invalidateAllQueries();
    if (actionType === ActionEnumType.NOTIFY) {
      toast.success('Notified successfully');
    }
    return {
      action: actionType,
      success: true,
    };
  } else if (actionType === ActionEnumType.MASK || actionType === ActionEnumType.UNMASK) {
    const apiFunction =
      actionType === ActionEnumType.MASK
        ? getScanResultsApiClient().maskScanResult
        : getScanResultsApiClient().unmaskScanResult;
    const resultApi = apiWrapper({
      fn: apiFunction,
    });
    const result = await resultApi({
      modelScanResultsMaskRequest: {
        mask_action: ModelScanResultsMaskRequestMaskActionEnum.Global,
        result_ids: [...ids],
        scan_id: _scanId,
        scan_type: ScanTypeEnum.ComplianceScan,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 403) {
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
    invalidateAllQueries();
    if (actionType === ActionEnumType.MASK) {
      toast.success('Masked successfully');
    } else if (actionType === ActionEnumType.UNMASK) {
      toast.success('Unmasked successfully');
    }
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
      scanType: ScanTypeEnum.ComplianceScan,
    });

    if (!result.ok) {
      if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          action: actionType,
          message,
          success: false,
        };
      }
      throw result.error;
    }
    return {
      action: actionType,
      success: true,
    };
  } else {
    throw new Error('Unknown action type');
  }
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
    ...queries.posture.postureScanResults({
      scanId,
      nodeType,
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams) || {
        sortBy: 'status',
        descending: true,
      },
      benchmarkTypes: searchParams.getAll('benchmarkType').map((type) => {
        if (type.toLowerCase() === 'soc2') {
          type = 'soc_2';
        }
        return type.toLowerCase();
      }),
      visibility: searchParams.getAll('visibility'),
      status: searchParams.getAll('status'),
      testNumber: searchParams.getAll('testNumber'),
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
          <div className="flex gap-3 items-center text-status-error">
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
          <span>The selected posture will be deleted.</span>
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
            <p className="mt-2 text-p7 text-status-error">{fetcher.data?.message}</p>
          )}
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
            Notify compliances
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
            <span>The selected compliances will be notified.</span>
            <br />
            <SelectNotificationChannel />
            <br />
            {ids.length > 1 ? (
              <>
                <span>Do you want to notify each compliance separately?</span>
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
  const { nodeType = '' } = useParams();
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
      scanType: ScanTypeEnum.ComplianceScan,
      nodeId: node_id ?? '',
      nodeType: node_type ?? '',
      size: Number.MAX_SAFE_INTEGER,
    }),
  });

  useEffect(() => {
    refetch();
  }, [scan_id]);

  if (!node_id || !node_type || !scan_id) {
    throw new Error('Scan id, Node type and Node id are required');
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
          scanType={ScanTypeEnum.CloudComplianceScan}
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
          scanType={ScanTypeEnum.ComplianceScan}
        />
      )}
      {showScanCompareModal && (
        <PosturesCompare
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
                scanType: UtilsReportFiltersScanTypeEnum.Compliance,
                nodeType: node_type as UtilsReportFiltersNodeTypeEnum,
              });
            },
            onScanClick: () => {
              navigate(
                generatePath('/posture/scan-results/:nodeType/:scanId', {
                  scanId: encodeURIComponent(item.scanId),
                  nodeType,
                }),
                {
                  replace: true,
                },
              );
            },
          }))}
          currentTimeStamp={formatMilliseconds(created_at ?? '')}
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
                      generatePath('./../:scanId', {
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
            <div className="pl-1.5 flex">
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
                    scanId: scan_id ?? '',
                    scanType: UtilsReportFiltersScanTypeEnum.Compliance,
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
                onClick={() => setScanIdToDelete(scan_id ?? '')}
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
}: {
  ids: string[];
  trigger: React.ReactNode;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (ids: string[], actionType: string) => void;
}) => {
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
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.MASK)}>
              Mask
            </DropdownItem>
            <DropdownItem onClick={() => onTableAction(ids, ActionEnumType.UNMASK)}>
              Un-mask
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                setOpenNotifyModal(true);
              }}
            >
              Notify
            </DropdownItem>
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
  onTableAction: (ids: string[], actionType: string) => void;
}) => {
  const [openNotifyModal, setOpenNotifyModal] = useState<boolean>(false);
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
const FILTER_SEARCHPARAMS: Record<string, string> = {
  visibility: 'Masked/Unmasked',
  status: 'Status',
  benchmarkType: 'Benchmark',
  testNumber: 'ID',
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
  const [benchmarkQuery, setBenchmarkQuery] = useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  const params = useParams() as {
    nodeType: ComplianceScanNodeTypeEnum;
    scanId: string;
  };

  if (!params.scanId) {
    console.warn('No scan id found');
  }
  let _nodeType = params.nodeType;

  if (_nodeType.toString() === 'kubernetes') {
    _nodeType = ComplianceScanNodeTypeEnum.kubernetes_cluster;
  } else if (_nodeType.toString() === 'linux') {
    _nodeType = ComplianceScanNodeTypeEnum.host;
  }

  const benchmarks = complianceType[_nodeType];

  let statuses: string[] = [];

  if (params.nodeType.toString() === 'linux') {
    statuses = ['info', 'pass', 'warn', 'note'];
  } else {
    statuses = ['alarm', 'info', 'ok', 'skip', 'delete'];
  }

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
        <SearchablePostureTestNumber
          scanId={params.scanId}
          defaultSelectedTestNumber={searchParams.getAll('testNumber')}
          onChange={(values) => {
            setSearchParams((prev) => {
              prev.delete('testNumber');
              values.forEach((value) => {
                prev.append('testNumber', value);
              });
              prev.delete('page');
              return prev;
            });
          }}
          onClearAll={() => {
            setSearchParams((prev) => {
              prev.delete('testNumber');
              prev.delete('page');
              return prev;
            });
          }}
        />
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

const PostureResults = () => {
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
      <div className="h-12 flex items-center">
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
        <PostureTable
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

const PostureTable = ({
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
  const { mode } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = useScanResults();
  const columnHelper = createColumnHelper<ModelCompliance>();
  const [sort, setSort] = useSortingState();
  const params = useParams();

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        minSize: 25,
        size: 25,
        maxSize: 25,
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
                <div className="h-[16px] w-[16px] text-text-text-and-icon rotate-90">
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
        id: 'test_number',
        enableSorting: true,
        enableResizing: false,
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${encodeURIComponent(info.getValue())}`,
              search: searchParams.toString(),
            }}
            className="flex items-center gap-x-[6px]"
          >
            <div className="w-4 h-4 text-text-text-and-icon">
              <PostureIcon />
            </div>
            <TruncatedText
              text={info.row.original.test_number ?? info.row.original.node_id}
            />
          </DFLink>
        ),
        header: () => 'ID',
        minSize: 90,
        size: 90,
        maxSize: 90,
      }),
      columnHelper.accessor('test_category', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => <TruncatedText text={info.getValue()} />,
        header: () => 'Category',
        minSize: 80,
        size: 90,
        maxSize: 95,
      }),
      columnHelper.accessor('compliance_check_type', {
        enableSorting: true,
        enableResizing: false,
        cell: (info) => info.getValue().toUpperCase(),
        header: () => 'Check type',
        minSize: 60,
        size: 60,
        maxSize: 70,
      }),
      columnHelper.accessor('status', {
        enableResizing: false,
        enableSorting: true,
        minSize: 40,
        size: 50,
        maxSize: 60,
        header: () => <div>Status</div>,
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2">
              <PostureStatusBadgeIcon
                status={info.getValue() as PostureSeverityType}
                theme={mode}
              />
              {upperFirst(info.getValue())}
            </div>
          );
        },
      }),
      columnHelper.accessor('description', {
        enableResizing: false,
        enableSorting: false,
        minSize: 140,
        size: 150,
        maxSize: 160,
        header: () => 'Description',
        cell: (info) => (
          <TruncatedText text={info.getValue() || 'No description available'} />
        ),
      }),
    ];
    if (params.nodeType && params.nodeType === 'kubernetes') {
      columns.splice(
        columns.length - 1,
        0,
        columnHelper.accessor('resource', {
          enableResizing: false,
          minSize: 60,
          size: 70,
          maxSize: 80,
          header: () => <div>Resource (ID)</div>,
          cell: (info) => {
            return <TruncatedText text={info.getValue()} />;
          },
        }),
      );
    }
    return columns;
  }, [setSearchParams, params.nodeType, mode]);

  const { data: scanResultData, scanStatusResult } = data;

  return (
    <Table
      size="default"
      data={scanResultData?.compliances ?? []}
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
            pageIndex: scanResultData?.pagination.currentPage ?? 0,
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
      noDataElement={
        <TablePlaceholder
          scanStatus={scanStatusResult?.status ?? ''}
          message={scanStatusResult?.status_message ?? ''}
        />
      }
      getTdProps={(cell) => {
        const status = cell.row.original.status;
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
              'first:before:bg-status-error': isAlarmStatus(status),
              'first:before:bg-status-info': isInfoStatus(status),
              'first:before:bg-status-success':
                isOkStatus(status) || isPassStatus(status),
              'first:before:bg-severity-unknown':
                isSkipStatus(status) || isNoteStatus(status),
              'first:before:bg-status-warning': isWarnStatus(status),
              'first:before:bg-btn-red': isDeleteStatus(status),
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
    </BreadcrumbWrapper>
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
      <BreadcrumbLink isLink asChild>
        <DFLink
          to={generatePath('/posture/accounts/:nodeType', {
            nodeType: params.nodeType,
          })}
        >
          {providersToNameMapping[params.nodeType]}
        </DFLink>
      </BreadcrumbLink>
      <BreadcrumbLink isLast>
        <span className="inherit cursor-auto">{node_name}</span>
      </BreadcrumbLink>
    </>
  );
};

const StatusesCount = ({
  statusCounts,
}: {
  statusCounts: {
    [k: string]: number;
  };
}) => {
  const { mode } = useTheme();
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="col-span-6">
      <div className="flex justify-evenly gap-8">
        {Object.keys(statusCounts)?.map((key: string) => {
          return (
            <div key={key} className="col-span-2 text-text-text-and-icon">
              <span className="text-p1a">{capitalize(key)}</span>
              <button
                className="flex flex-1 max-w-[160px] gap-1 items-center"
                onClick={() => {
                  setSearchParams((prev) => {
                    prev.delete('page');
                    Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                      prev.delete(key);
                    });
                    prev.append('status', key.toLowerCase());
                    return prev;
                  });
                }}
              >
                <PostureStatusBadgeIcon
                  theme={mode}
                  status={key.toLowerCase() as PostureSeverityType}
                  className="h-6 w-6"
                />
                <span className="text-h1 text-text-input-value pl-1.5">
                  {abbreviateNumber(statusCounts?.[key])}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ScanStatusWrapper = ({
  children,
  scanStatusResult,
  displayNoData,
  className,
}: {
  children: React.ReactNode;
  className: string;
  scanStatusResult: ModelScanInfo | undefined;
  displayNoData?: boolean;
}) => {
  if (isScanFailed(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusInError errorMessage={scanStatusResult?.status_message ?? ''} />
      </div>
    );
  }

  if (isScanStopped(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusStopped errorMessage={scanStatusResult?.status_message ?? ''} />
      </div>
    );
  }

  if (isScanStopping(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
        <ScanStatusStopping />
      </div>
    );
  }

  if (isScanInProgress(scanStatusResult?.status ?? '')) {
    return (
      <div className={className}>
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
      <div className={className}>
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

  const statusCounts: {
    [k: string]: number;
  } = data?.statusCounts ?? {};

  const total = Object.values(statusCounts).reduce((acc, v) => {
    acc = acc + v;
    return acc;
  }, 0);

  const [, setSearchParams] = useSearchParams();

  return (
    <div className="grid grid-cols-12 px-6 items-center">
      <ScanStatusWrapper
        scanStatusResult={scanStatusResult}
        className="col-span-4 flex items-center justify-center min-h-[120px]"
      >
        <div className="col-span-2 h-[120px] w-[120px]">
          <PostureScanResultsPieChart
            data={statusCounts}
            onChartClick={({ name }: { name: string; value: string | number | Date }) => {
              setSearchParams((prev) => {
                prev.delete('page');
                Object.keys(FILTER_SEARCHPARAMS).forEach((key) => {
                  prev.delete(key);
                });
                prev.append('status', name.toLowerCase());
                return prev;
              });
            }}
          />
        </div>
      </ScanStatusWrapper>

      {isScanComplete(scanStatusResult?.status ?? '') ? (
        <div className="col-span-2 text-text-text-and-icon">
          <span className="text-p1a">Total compliances</span>
          <button
            className="flex flex-1 max-w-[160px] gap-1 items-center dark:text-text-input-value text-text-text-and-icon"
            onClick={() => {
              setSearchParams((prev) => {
                prev.delete('status');
                prev.delete('page');
                return prev;
              });
            }}
          >
            {keys(statusCounts).length > 0 ? (
              <>
                <TaskIcon />
                <span className="text-h1 dark:text-text-input-value text-text-text-and-icon pl-1.5">
                  {abbreviateNumber(total)}
                </span>
              </>
            ) : (
              <ScanStatusNoData />
            )}
          </button>
        </div>
      ) : null}
      <div className="w-px h-[60%] bg-bg-grid-border" />

      <ScanStatusWrapper
        scanStatusResult={scanStatusResult}
        className="col-span-4 flex items-center justify-center min-h-[120px]"
      >
        {keys(statusCounts).length === 0 ? (
          <div className="col-span-6 flex items-center justify-center">
            <ScanStatusNoData />
          </div>
        ) : (
          <StatusesCount statusCounts={statusCounts} />
        )}
      </ScanStatusWrapper>
    </div>
  );
};

const Widgets = () => {
  return (
    <Card className="max-h-[130px] px-4 py-2.5 flex items-center">
      <div className="flex-1 pl-4">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[120px]">
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
const PostureScanResults = () => {
  return (
    <>
      <Header />
      <div className="mx-4">
        <ScanHistory />
        <Widgets />
        <PostureResults />
        <Outlet />
      </div>
    </>
  );
};

export const module = {
  action,
  element: <PostureScanResults />,
};
