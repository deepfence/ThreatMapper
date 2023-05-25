import cx from 'classnames';
import { capitalize } from 'lodash-es';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaHistory } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import {
  HiArchive,
  HiBell,
  HiChevronRight,
  HiDotsVertical,
  HiEye,
  HiEyeOff,
  HiOutlineDownload,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  ActionFunctionArgs,
  generatePath,
  LoaderFunctionArgs,
  Outlet,
  useFetcher,
  useLoaderData,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Card,
  Checkbox,
  CircleSpinner,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  IconButton,
  Modal,
  Popover,
  RowSelectionState,
  Select,
  SelectItem,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getCloudComplianceApiClient, getScanResultsApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelCloudCompliance,
  ModelComplianceScanInfo,
  ModelScanResultsReq,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import {
  HeaderSkeleton,
  RectSkeleton,
  SquareSkeleton,
  TimestampSkeleton,
} from '@/components/header/HeaderSkeleton';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { complianceType } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import {
  NoIssueFound,
  ScanStatusInError,
  ScanStatusInProgress,
} from '@/components/ScanStatusMessage';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { POSTURE_STATUS_COLORS } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { ScanHistoryApiLoaderDataType } from '@/features/common/data-component/scanHistoryApiLoader';
import { useGetCloudFilters } from '@/features/common/data-component/searchCloudFiltersApiLoader';
import { PostureResultChart } from '@/features/postures/components/PostureResultChart';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { PostureSeverityType, ScanStatusEnum, ScanTypeEnum } from '@/types/common';
import { ApiError, apiWrapper, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { isScanComplete, isScanFailed } from '@/utils/scan';
import { DFAwait } from '@/utils/suspense';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

export interface FocusableElement {
  focus(options?: FocusOptions): void;
}
export const STATUSES: { [k: string]: string } = {
  INFO: 'info',
  PASS: 'pass',
  WARN: 'warn',
  NOTE: 'note',
  ALARM: 'alarm',
  OK: 'ok',
  SKIP: 'skip',
};
enum ActionEnumType {
  MASK = 'mask',
  UNMASK = 'unmask',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  NOTIFY = 'notify',
  DELETE_SCAN = 'delete_scan',
}

type ScanResult = {
  totalStatus: number;
  statusCounts: { [key: string]: number };
  nodeName: string;
  timestamp: number;
  compliances: ModelCloudCompliance[];
  pagination: {
    currentPage: number;
    totalRows: number;
  };
};

export type LoaderDataType = {
  error?: string;
  scanStatusResult?: ModelComplianceScanInfo;
  message?: string;
  data?: ScanResult;
};

const PAGE_SIZE = 15;

const getStatusSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('status');
};
const getMaskSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('mask');
};
const getUnmaskSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('unmask');
};

const getBenchmarkType = (searchParams: URLSearchParams) => {
  return searchParams.getAll('benchmarkType');
};

const getServices = (searchParams: URLSearchParams) => {
  return searchParams.getAll('services');
};

async function getScans(
  scanId: string,
  searchParams: URLSearchParams,
): Promise<LoaderDataType> {
  // status api
  const statusResult = await makeRequest({
    apiFunction: getCloudComplianceApiClient().statusCloudComplianceScan,
    apiArgs: [
      {
        modelScanStatusReq: {
          scan_ids: [scanId],
          bulk_scan_id: '',
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({
        message: '',
      });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(statusResult)) {
    return statusResult.value();
  }
  const statuses = statusResult?.statuses?.[0];

  if (!statusResult || !statuses || !statuses.scan_id) {
    throw new Error('Scan status not found');
  }

  const scanStatus = statuses.status;

  const isScanRunning =
    scanStatus !== ScanStatusEnum.complete && scanStatus !== ScanStatusEnum.error;
  const isScanError = scanStatus === ScanStatusEnum.error;

  if (isScanRunning || isScanError) {
    return {
      scanStatusResult: statuses,
    };
  }
  const status = getStatusSearch(searchParams);
  const page = getPageFromSearchParams(searchParams);
  const order = getOrderFromSearchParams(searchParams);
  const mask = getMaskSearch(searchParams);
  const unmask = getUnmaskSearch(searchParams);
  const benchmarkTypes = getBenchmarkType(searchParams);
  const services = getServices(searchParams);

  const scanResultsReq: ModelScanResultsReq = {
    fields_filter: {
      contains_filter: {
        filter_in: {},
      },
      match_filter: { filter_in: {} },
      order_filter: { order_fields: [] },
      compare_filter: null,
    },
    scan_id: scanId,
    window: {
      offset: page * PAGE_SIZE,
      size: PAGE_SIZE,
    },
  };

  if (status.length) {
    scanResultsReq.fields_filter.contains_filter.filter_in!['status'] = status;
  }

  if ((mask.length || unmask.length) && !(mask.length && unmask.length)) {
    scanResultsReq.fields_filter.contains_filter.filter_in!['masked'] = [
      mask.length ? true : false,
    ];
  }

  if (benchmarkTypes.length) {
    scanResultsReq.fields_filter.contains_filter.filter_in!['compliance_check_type'] =
      benchmarkTypes;
  }

  if (services.length) {
    scanResultsReq.fields_filter.contains_filter.filter_in!['service'] = services;
  }

  if (order) {
    scanResultsReq.fields_filter.order_filter.order_fields?.push({
      field_name: order.sortBy,
      descending: order.descending,
    });
  }

  let result = null;
  let resultCounts = null;

  result = await makeRequest({
    apiFunction: getCloudComplianceApiClient().resultCloudComplianceScan,
    apiArgs: [
      {
        modelScanResultsReq: scanResultsReq,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400 || r.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });
  resultCounts = await makeRequest({
    apiFunction: getCloudComplianceApiClient().resultCountCloudComplianceScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          ...scanResultsReq,
          window: {
            ...scanResultsReq.window,
            size: 10 * scanResultsReq.window.size,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{ message?: string }>({});
      if (r.status === 400 || r.status === 404) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    return result.value();
  }
  if (ApiError.isApiError(resultCounts)) {
    return resultCounts.value();
  }

  const totalStatus = Object.values(result.status_counts ?? {}).reduce((acc, value) => {
    acc = acc + value;
    return acc;
  }, 0);

  const cloudComplianceStatus = {
    alarm: result.status_counts?.[STATUSES.ALARM] ?? 0,
    info: result.status_counts?.[STATUSES.INFO] ?? 0,
    ok: result.status_counts?.[STATUSES.OK] ?? 0,
    skip: result.status_counts?.[STATUSES.SKIP] ?? 0,
  };

  return {
    scanStatusResult: statuses,
    data: {
      totalStatus,
      nodeName: result.node_id,
      statusCounts: cloudComplianceStatus,
      timestamp: result.updated_at,
      compliances: result.compliances ?? [],
      pagination: {
        currentPage: page,
        totalRows: page * PAGE_SIZE + resultCounts.count,
      },
    },
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const scanId = params?.scanId ?? '';

  if (!scanId) {
    throw new Error('Scan Id is required');
  }
  const searchParams = new URL(request.url).searchParams;

  return typedDefer({
    data: getScans(scanId, searchParams),
  });
};

type ActionFunctionType =
  | ReturnType<typeof getScanResultsApiClient>['deleteScanResult']
  | ReturnType<typeof getScanResultsApiClient>['maskScanResult']
  | ReturnType<typeof getScanResultsApiClient>['notifyScanResult']
  | ReturnType<typeof getScanResultsApiClient>['unmaskScanResult'];

type ActionData = {
  success: boolean;
  message?: string;
} | null;

const action = async ({
  params: { scanId = '' },
  request,
}: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const ids = (formData.getAll('ids[]') ?? []) as string[];
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
    result = await makeRequest({
      apiFunction: apiFunction,
      apiArgs: [
        {
          modelScanResultsActionRequest: {
            result_ids: [...ids],
            scan_id: _scanId,
            scan_type: ScanTypeEnum.CloudComplianceScan,
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<{
          message?: string;
        }>({});
        if (r.status === 400 || r.status === 409) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message ?? '',
          });
        } else if (r.status === 403) {
          if (actionType === ActionEnumType.DELETE) {
            return error.set({
              message: 'You do not have enough permissions to delete compliance',
            });
          } else if (actionType === ActionEnumType.NOTIFY) {
            return error.set({
              message: 'You do not have enough permissions to notify',
            });
          }
        }
      },
    });
  } else if (actionType === ActionEnumType.MASK || actionType === ActionEnumType.UNMASK) {
    apiFunction =
      actionType === ActionEnumType.MASK
        ? getScanResultsApiClient().maskScanResult
        : getScanResultsApiClient().unmaskScanResult;
    result = await makeRequest({
      apiFunction: apiFunction,
      apiArgs: [
        {
          modelScanResultsMaskRequest: {
            result_ids: [...ids],
            scan_id: _scanId,
            scan_type: ScanTypeEnum.CloudComplianceScan,
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<{
          message?: string;
        }>({});
        if (r.status === 400 || r.status === 409) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message ?? '',
          });
        }
      },
    });
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
          message: 'You do not have enough permissions to delete scan',
          success: false,
        };
      }
      throw new Error('Error deleting scan');
    }
  }

  if (ApiError.isApiError(result)) {
    if (result.value()?.message !== undefined) {
      const message = result.value()?.message ?? 'Something went wrong';
      toast.error(message);
    }
  }

  if (actionType === ActionEnumType.DELETE || actionType === ActionEnumType.DELETE_SCAN) {
    return {
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

const DeleteConfirmationModal = ({
  showDialog,
  ids,
  setShowDialog,
}: {
  showDialog: boolean;
  ids: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<ActionData>();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('ids[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      {!fetcher.data?.success ? (
        <div className="grid place-items-center p-6">
          <IconContext.Provider
            value={{
              className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
            }}
          >
            <HiOutlineExclamationCircle />
          </IconContext.Provider>
          <h3 className="mb-4 font-normal text-center text-sm">
            The selected compliances will be deleted.
            <br />
            <span>Are you sure you want to delete?</span>
          </h3>
          {fetcher.data?.message && (
            <p className="text-sm text-red-500 pb-3">{fetcher.data?.message}</p>
          )}
          <div className="flex items-center justify-right gap-4">
            <Button size="xs" onClick={() => setShowDialog(false)} type="button" outline>
              No, Cancel
            </Button>
            <Button
              size="xs"
              color="danger"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onDeleteAction(ActionEnumType.DELETE);
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
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
    <Modal open={open} onOpenChange={onOpenChange}>
      {!fetcher.data?.success ? (
        <div className="grid place-items-center p-6">
          <IconContext.Provider
            value={{
              className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
            }}
          >
            <HiOutlineExclamationCircle />
          </IconContext.Provider>
          <h3 className="mb-4 font-normal text-center text-sm">
            <span>Are you sure you want to delete the scan?</span>
          </h3>
          {fetcher.data?.message && (
            <p className="text-sm text-red-500 pb-3">{fetcher.data?.message}</p>
          )}
          <div className="flex items-center justify-right gap-4">
            <Button size="xs" onClick={() => onOpenChange(false)} type="button" outline>
              No, Cancel
            </Button>
            <Button
              loading={fetcher.state === 'loading'}
              disabled={fetcher.state === 'loading'}
              size="xs"
              color="danger"
              onClick={(e) => {
                e.preventDefault();
                onDeleteScan();
              }}
            >
              Yes, I&apos;m sure
            </Button>
          </div>
        </div>
      ) : (
        <SuccessModalContent text="Scan deleted successfully!" />
      )}
    </Modal>
  );
};

const HistoryDropdown = ({ nodeType }: { nodeType: string }) => {
  const { navigate } = usePageNavigation();
  const fetcher = useFetcher<ScanHistoryApiLoaderDataType>();
  const loaderData = useLoaderData() as LoaderDataType;
  const params = useParams() as {
    scanId: string;
    nodeType: string;
  };
  const isScanHistoryLoading = fetcher.state === 'loading';
  const { downloadScan } = useDownloadScan();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [scanIdToDelete, setScanIdToDelete] = useState<string | null>(null);

  const onHistoryClick = (nodeId: string) => {
    fetcher.load(
      generatePath('/data-component/scan-history/:scanType/:nodeType/:nodeId', {
        nodeId: nodeId,
        nodeType: 'cloud_account',
        scanType: ScanTypeEnum.CloudComplianceScan,
      }),
    );
  };

  return (
    <>
      <Suspense
        fallback={
          <Button
            size="xs"
            color="primary"
            outline
            className="rounded-lg bg-transparent"
            startIcon={<FaHistory />}
            type="button"
            loading
          >
            Scan History
          </Button>
        }
      >
        <DFAwait resolve={loaderData.data ?? []}>
          {(resolvedData: LoaderDataType) => {
            const { scanStatusResult } = resolvedData;
            const { scan_id, node_id, node_type } = scanStatusResult ?? {};
            if (!scan_id || !node_id || !node_type) {
              throw new Error('Scan id, node id or node type is missing');
            }

            return (
              <Popover
                open={popoverOpen}
                triggerAsChild
                onOpenChange={(open) => {
                  if (open) onHistoryClick(node_id);
                  setPopoverOpen(open);
                }}
                content={
                  <div className="p-4 max-h-80 overflow-y-auto flex flex-col gap-2">
                    {fetcher.state === 'loading' && !fetcher.data?.data?.length && (
                      <div className="flex items-center justify-center p-4">
                        <CircleSpinner size="lg" />
                      </div>
                    )}
                    {[...(fetcher?.data?.data ?? [])].reverse().map((item) => {
                      const isCurrentScan = item.scanId === scan_id;
                      return (
                        <div key={item.scanId} className="flex gap-2 justify-between">
                          <button
                            className="flex gap-2 justify-between flex-grow"
                            onClick={() => {
                              navigate(
                                generatePath(
                                  '/posture/cloud/scan-results/:nodeType/:scanId',
                                  {
                                    scanId: item.scanId,
                                    nodeType: params.nodeType,
                                  },
                                ),
                                {
                                  replace: true,
                                },
                              );
                              setPopoverOpen(false);
                            }}
                          >
                            <span
                              className={twMerge(
                                cx(
                                  'flex items-center text-gray-700 dark:text-gray-400 gap-x-4',
                                  {
                                    'text-blue-600 dark:text-blue-500': isCurrentScan,
                                  },
                                ),
                              )}
                            >
                              {formatMilliseconds(item.updatedAt)}
                            </span>
                            <ScanStatusBadge status={item.status} />
                          </button>
                          <div className="flex gap-1">
                            <IconButton
                              color="primary"
                              outline
                              size="xxs"
                              disabled={!isScanComplete(item.status)}
                              className="rounded-lg bg-transparent"
                              icon={<HiOutlineDownload />}
                              onClick={(e) => {
                                e.preventDefault();
                                downloadScan({
                                  scanId: item.scanId,
                                  scanType:
                                    UtilsReportFiltersScanTypeEnum.CloudCompliance,
                                  nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
                                });
                              }}
                            />
                            <IconButton
                              color="danger"
                              outline
                              size="xxs"
                              disabled={
                                isCurrentScan ||
                                (!isScanComplete(item.status) &&
                                  !isScanFailed(item.status))
                              }
                              className="rounded-lg bg-transparent"
                              icon={<HiOutlineTrash />}
                              onClick={(e) => {
                                e.preventDefault();
                                setScanIdToDelete(item.scanId);
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                }
              >
                <Button
                  size="xs"
                  color="primary"
                  outline
                  startIcon={<FaHistory />}
                  type="button"
                  loading={isScanHistoryLoading}
                >
                  Scan History
                </Button>
              </Popover>
            );
          }}
        </DFAwait>
      </Suspense>
      {scanIdToDelete && (
        <DeleteScanConfirmationModal
          scanId={scanIdToDelete}
          open={!!scanIdToDelete}
          onOpenChange={(open) => {
            if (!open) setScanIdToDelete(null);
          }}
        />
      )}
    </>
  );
};

const ActionDropdown = ({
  ids,
  align,
  triggerButton,
  setIdsToDelete,
  setShowDeleteDialog,
}: {
  ids: string[];
  align: 'center' | 'end' | 'start';
  triggerButton: React.ReactNode;
  setIdsToDelete: React.Dispatch<React.SetStateAction<string[]>>;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onTableAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('ids[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids],
  );

  return (
    <Dropdown
      triggerAsChild={true}
      align={align}
      content={
        <>
          <DropdownItem onClick={() => onTableAction(ActionEnumType.MASK)}>
            <IconContext.Provider
              value={{ className: 'text-gray-700 dark:text-gray-400' }}
            >
              <HiEyeOff />
            </IconContext.Provider>
            <span className="text-gray-700 dark:text-gray-400">Mask</span>
          </DropdownItem>
          <DropdownItem onClick={() => onTableAction(ActionEnumType.UNMASK)}>
            <IconContext.Provider
              value={{ className: 'text-gray-700 dark:text-gray-400' }}
            >
              <HiEye />
            </IconContext.Provider>
            <span className="text-gray-700 dark:text-gray-400">Un mask</span>
          </DropdownItem>
          <DropdownItem
            className="text-sm"
            onClick={() => onTableAction(ActionEnumType.NOTIFY)}
          >
            <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
              <IconContext.Provider
                value={{ className: 'text-gray-700 dark:text-gray-400' }}
              >
                <HiBell />
              </IconContext.Provider>
              Notify
            </span>
          </DropdownItem>
          <DropdownItem
            className="text-sm"
            onClick={() => {
              setIdsToDelete(ids);
              setShowDeleteDialog(true);
            }}
          >
            <span className="flex items-center gap-x-2 text-red-700 dark:text-red-400">
              <IconContext.Provider
                value={{ className: 'text-red-700 dark:text-red-400' }}
              >
                <HiArchive />
              </IconContext.Provider>
              Delete
            </span>
          </DropdownItem>
        </>
      }
    >
      {triggerButton}
    </Dropdown>
  );
};
const ScanResultTable = () => {
  const fetcher = useFetcher();
  const loaderData = useLoaderData() as LoaderDataType;
  const columnHelper = createColumnHelper<ModelCloudCompliance>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [sort, setSort] = useSortingState();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [idsToDelete, setIdsToDelete] = useState<string[]>([]);
  useEffect(() => {
    if (idsToDelete.length) {
      setRowSelectionState({});
    }
  }, [loaderData.data]);

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 35,
        minSize: 30,
        maxSize: 40,
      }),
      columnHelper.accessor('control_id', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => (
          <DFLink
            to={{
              pathname: `./${encodeURIComponent(info.row.original.node_id)}`,
              search: searchParams.toString(),
            }}
            className="flex items-center gap-x-2"
          >
            <div className="p-1.5 bg-gray-100 shrink-0 dark:bg-gray-500/10 rounded-lg">
              <div className="w-4 h-4">
                <PostureIcon />
              </div>
            </div>
            <div className="truncate">{info.row.original.control_id}</div>
          </DFLink>
        ),
        header: () => 'Control ID',
        minSize: 75,
        size: 80,
        maxSize: 85,
      }),
      columnHelper.accessor('compliance_check_type', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => info.getValue().toUpperCase(),
        header: () => 'Benchmark Type',
        minSize: 50,
        size: 60,
        maxSize: 65,
      }),
      columnHelper.accessor('service', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => info.getValue(),
        header: () => 'Service',
        minSize: 50,
        size: 60,
        maxSize: 65,
      }),
      columnHelper.accessor('resource', {
        enableResizing: false,
        enableSorting: false,
        minSize: 115,
        size: 120,
        maxSize: 125,
        header: () => 'Resource',
        cell: (cell) => cell.getValue(),
      }),
      columnHelper.accessor('description', {
        enableResizing: false,
        enableSorting: false,
        minSize: 115,
        size: 120,
        maxSize: 125,
        header: () => 'Description',
        cell: (cell) => cell.getValue(),
      }),
      columnHelper.accessor('status', {
        enableResizing: false,
        minSize: 60,
        size: 60,
        maxSize: 65,
        header: () => <div>Status</div>,
        cell: (info) => {
          return (
            <Badge
              label={info.getValue().toUpperCase()}
              className={cx({
                'bg-[#F05252]/20 dark:bg-[#F05252]/20 text-red-500 dark:text-[#F05252]':
                  info.getValue().toLowerCase() === STATUSES.ALARM,
                'bg-[#3F83F8]/20 dark:bg-[#3F83F8/20 text-[blue-500 dark:text-[#3F83F8]':
                  info.getValue().toLowerCase() === STATUSES.INFO,
                'bg-[#0E9F6E]/30 dark:bg-[##0E9F6E]/10 text-green-500 dark:text-[#0E9F6E]':
                  info.getValue().toLowerCase() === STATUSES.OK,
                'bg-[#FF5A1F]/20 dark:bg-[#FF5A1F]/10 text-orange-500 dark:text-[#FF5A1F]':
                  info.getValue().toLowerCase() === STATUSES.WARN,
                'bg-[#6B7280]/20 dark:bg-[#6B7280]/10 text-gray-700 dark:text-gray-300':
                  info.getValue().toLowerCase() === STATUSES.SKIP,
                'bg-[#0E9F6E]/10 dark:bg-[#0E9F6E]/10 text-green-500 dark:text-[#0E9F6E]':
                  info.getValue().toLowerCase() === STATUSES.PASS,
                'bg-[#d6e184]/10 dark:bg-[#d6e184]/10 text-yellow-500 dark:text-[#d6e184]':
                  info.getValue().toLowerCase() === STATUSES.NOTE,
              })}
              size="sm"
            />
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            ids={[cell.row.original.node_id]}
            align="end"
            setIdsToDelete={setIdsToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
            triggerButton={
              <Button size="xs" color="normal">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <HiDotsVertical />
                </IconContext.Provider>
              </Button>
            }
          />
        ),
        header: () => '',
        minSize: 40,
        size: 40,
        maxSize: 40,
        enableResizing: false,
      }),
    ];

    return columns;
  }, [setSearchParams]);

  return (
    <div className="self-start">
      <Suspense fallback={<TableSkeleton columns={6} rows={10} size={'md'} />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType) => {
            const { data, scanStatusResult } = resolvedData;

            if (scanStatusResult?.status === ScanStatusEnum.error) {
              return <ScanStatusInError errorMessage={scanStatusResult.status_message} />;
            } else if (
              scanStatusResult?.status !== ScanStatusEnum.error &&
              scanStatusResult?.status !== ScanStatusEnum.complete
            ) {
              return <ScanStatusInProgress LogoIcon={PostureIcon} />;
            } else if (
              scanStatusResult?.status === ScanStatusEnum.complete &&
              data &&
              data.pagination.currentPage === 0 &&
              data.compliances.length === 0
            ) {
              return (
                <NoIssueFound
                  LogoIcon={PostureIcon}
                  scanType={ScanTypeEnum.CloudComplianceScan}
                />
              );
            }

            if (!data) {
              return null;
            }
            return (
              <>
                {Object.keys(rowSelectionState).length === 0 ? (
                  <div className="text-sm text-gray-400 font-medium mb-3">
                    No rows selected
                  </div>
                ) : (
                  <>
                    <div className="mb-1.5">
                      <ActionDropdown
                        ids={Object.keys(rowSelectionState)}
                        align="start"
                        setIdsToDelete={setIdsToDelete}
                        setShowDeleteDialog={setShowDeleteDialog}
                        triggerButton={
                          <Button size="xxs" color="primary" outline>
                            Actions
                          </Button>
                        }
                      />
                    </div>
                  </>
                )}
                {showDeleteDialog && (
                  <DeleteConfirmationModal
                    showDialog={showDeleteDialog}
                    ids={idsToDelete}
                    setShowDialog={setShowDeleteDialog}
                  />
                )}
                <Table
                  size="sm"
                  data={data.compliances}
                  columns={columns}
                  enableRowSelection
                  rowSelectionState={rowSelectionState}
                  onRowSelectionChange={setRowSelectionState}
                  enablePagination
                  manualPagination
                  approximatePagination
                  enableColumnResizing
                  totalRows={data.pagination.totalRows}
                  pageSize={PAGE_SIZE}
                  pageIndex={data.pagination.currentPage}
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
                        pageIndex: data.pagination.currentPage,
                        pageSize: PAGE_SIZE,
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
                />
              </>
            );
          }}
        </DFAwait>
      </Suspense>
    </div>
  );
};

const FilterComponent = () => {
  const elementToFocusOnClose = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useParams() as {
    nodeType: string;
    scanId: string;
  };

  if (!params.scanId) {
    console.warn('No scan id found');
  }
  const {
    status,
    filters: { services, statuses },
  } = useGetCloudFilters(params.scanId);

  const nodeType = params.nodeType;
  let benchmarks: string[] = [];
  if (nodeType === ACCOUNT_CONNECTOR.AWS) {
    benchmarks = complianceType.aws;
  } else if (nodeType === ACCOUNT_CONNECTOR.GCP) {
    benchmarks = complianceType.gcp;
  } else if (nodeType === ACCOUNT_CONNECTOR.AZURE) {
    benchmarks = complianceType.azure;
  }

  const onResetFilters = () => {
    setSearchParams(() => {
      return {};
    });
  };

  return (
    <Popover
      triggerAsChild
      elementToFocusOnCloseRef={elementToFocusOnClose}
      content={
        <div className="dark:text-white w-[300px]">
          <FilterHeader onReset={onResetFilters} />
          <div className="flex flex-col gap-y-6 p-4">
            <fieldset>
              <legend className="text-sm font-medium">Mask And Unmask</legend>
              <div className="flex gap-x-4 mt-1">
                <Checkbox
                  label="Mask"
                  checked={searchParams.getAll('mask').includes('true')}
                  onCheckedChange={(state) => {
                    if (state) {
                      setSearchParams((prev) => {
                        prev.append('mask', 'true');
                        prev.delete('page');
                        return prev;
                      });
                    } else {
                      setSearchParams((prev) => {
                        const prevStatuses = prev.getAll('mask');
                        prev.delete('mask');
                        prevStatuses
                          .filter((mask) => mask !== 'true')
                          .forEach((mask) => {
                            prev.append('mask', mask);
                          });
                        prev.delete('mask');
                        prev.delete('page');
                        return prev;
                      });
                    }
                  }}
                />
                <Checkbox
                  label="Unmask"
                  checked={searchParams.getAll('unmask').includes('true')}
                  onCheckedChange={(state) => {
                    if (state) {
                      setSearchParams((prev) => {
                        prev.append('unmask', 'true');
                        prev.delete('page');
                        return prev;
                      });
                    } else {
                      setSearchParams((prev) => {
                        const prevStatuses = prev.getAll('unmask');
                        prev.delete('unmask');
                        prevStatuses
                          .filter((status) => status !== 'true')
                          .forEach((status) => {
                            prev.append('unmask', status);
                          });
                        prev.delete('unmask');
                        prev.delete('page');
                        return prev;
                      });
                    }
                  }}
                />
              </div>
            </fieldset>
            <fieldset>
              <Select
                noPortal
                name="benchmarkType"
                label={'Benchmark Type'}
                placeholder="Select Benchmark Type"
                value={searchParams.getAll('benchmarkType')}
                sizing="xs"
                onChange={(value) => {
                  setSearchParams((prev) => {
                    prev.delete('benchmarkType');
                    value.forEach((benchmarkType) => {
                      prev.append('benchmarkType', benchmarkType);
                    });
                    prev.delete('page');
                    return prev;
                  });
                }}
              >
                {benchmarks.map((status: string) => {
                  return (
                    <SelectItem value={status.toLowerCase()} key={status.toLowerCase()}>
                      {status.toUpperCase()}
                    </SelectItem>
                  );
                })}
              </Select>
            </fieldset>
            <fieldset>
              {status === 'loading' ? (
                <CircleSpinner size="xs" />
              ) : (
                <Select
                  noPortal
                  name="services"
                  label={'Service Name'}
                  placeholder="Select Service Name"
                  value={searchParams.getAll('services')}
                  sizing="xs"
                  onChange={(value) => {
                    setSearchParams((prev) => {
                      prev.delete('services');
                      value.forEach((service) => {
                        prev.append('services', service);
                      });
                      prev.delete('page');
                      return prev;
                    });
                  }}
                >
                  {services.map((service: string) => {
                    return (
                      <SelectItem value={service} key={service}>
                        {service}
                      </SelectItem>
                    );
                  })}
                </Select>
              )}
            </fieldset>
            <fieldset>
              <Select
                noPortal
                name="status"
                label={'Status'}
                placeholder="Select Status"
                value={searchParams.getAll('status')}
                sizing="xs"
                onChange={(value) => {
                  setSearchParams((prev) => {
                    prev.delete('status');
                    value.forEach((language) => {
                      prev.append('status', language);
                    });
                    prev.delete('page');
                    return prev;
                  });
                }}
              >
                {statuses.map((status: string) => {
                  return (
                    <SelectItem value={status.toLowerCase()} key={status.toLowerCase()}>
                      {status.toUpperCase()}
                    </SelectItem>
                  );
                })}
              </Select>
            </fieldset>
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
  );
};
const HeaderComponent = () => {
  const [searchParams] = useSearchParams();
  const params = useParams() as {
    nodeType: string;
  };
  const loaderData = useLoaderData() as LoaderDataType;
  const isFilterApplied =
    searchParams.has('status') ||
    searchParams.has('services') ||
    searchParams.has('mask') ||
    searchParams.has('unmask') ||
    searchParams.has('benchmarkType');

  return (
    <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <Suspense
        fallback={
          <HeaderSkeleton
            RightSkeleton={
              <>
                <TimestampSkeleton />
                <SquareSkeleton />
                <SquareSkeleton />
              </>
            }
            LeftSkeleton={
              <>
                <RectSkeleton width="w-40" height="h-4" />
                <RectSkeleton width="w-40" height="h-4" />
                <RectSkeleton width="w-40" height="h-4" />
              </>
            }
          />
        }
      >
        <DFAwait resolve={loaderData.data ?? []}>
          {(resolvedData: LoaderDataType) => {
            const { scanStatusResult } = resolvedData;
            const { scan_id, node_name, node_type, updated_at } = scanStatusResult ?? {};

            if (!scan_id || !node_type || !updated_at) {
              throw new Error('Scan id, node type or updated_at is missing');
            }

            return (
              <>
                <Breadcrumb separator={<HiChevronRight />} transparent>
                  <BreadcrumbLink>
                    <DFLink to={'/posture'}>Posture</DFLink>
                  </BreadcrumbLink>
                  <BreadcrumbLink>
                    <DFLink
                      to={generatePath('/posture/accounts/:nodeType', {
                        nodeType: params.nodeType,
                      })}
                    >
                      {providersToNameMapping[params.nodeType]}
                    </DFLink>
                  </BreadcrumbLink>

                  <BreadcrumbLink>
                    <span className="inherit cursor-auto">{node_name ?? ''}</span>
                  </BreadcrumbLink>
                </Breadcrumb>
                <div className="ml-auto flex items-center gap-x-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 dark:text-gray-200">
                      {formatMilliseconds(updated_at)}
                    </span>
                    <span className="text-gray-400 text-[10px]">Last scan</span>
                  </div>

                  <HistoryDropdown nodeType={node_type} />

                  <div className="relative">
                    {isFilterApplied && (
                      <span className="absolute left-0 top-0 inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                    )}
                    <FilterComponent />
                  </div>
                </div>
              </>
            );
          }}
        </DFAwait>
      </Suspense>
    </div>
  );
};

const StatusCountComponent = ({ theme }: { theme: Mode }) => {
  const loaderData = useLoaderData() as LoaderDataType;
  return (
    <Card className="p-4 grid grid-flow-row-dense gap-y-8">
      <Suspense
        fallback={
          <div className="min-h-[300px] flex items-center justify-center">
            <CircleSpinner size="md" />
          </div>
        }
      >
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType) => {
            const { data } = resolvedData;
            const statusCounts = data?.statusCounts ?? {};

            return (
              <>
                <div className="grid grid-flow-col-dense gap-x-4">
                  <div className="bg-red-100 dark:bg-red-500/10 rounded-lg flex items-center justify-center">
                    <div className="w-14 h-14 text-red-500 dark:text-red-400">
                      <PostureIcon />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-gray-200 tracking-wider">
                      Total Compliances
                    </h4>
                    <div className="mt-2">
                      <span className="text-2xl text-gray-900 dark:text-gray-200">
                        {data?.totalStatus}
                      </span>
                      <h5 className="text-xs text-gray-500 dark:text-gray-200 mb-2">
                        Total count
                      </h5>
                    </div>
                  </div>
                </div>
                <div className="h-[200px]">
                  <PostureResultChart
                    theme={theme}
                    data={statusCounts}
                    eoption={{
                      series: [
                        {
                          cursor: 'default',
                          color: [
                            POSTURE_STATUS_COLORS['alarm'],
                            POSTURE_STATUS_COLORS['info'],
                            POSTURE_STATUS_COLORS['ok'],
                            POSTURE_STATUS_COLORS['skip'],
                          ],
                        },
                      ],
                    }}
                  />
                </div>
                <div>
                  {Object.keys(statusCounts)?.map((key: string) => {
                    return (
                      <div key={key} className="flex items-center gap-2 p-1">
                        <div
                          className={cx('h-3 w-3 rounded-full')}
                          style={{
                            backgroundColor:
                              POSTURE_STATUS_COLORS[
                                key.toLowerCase() as PostureSeverityType
                              ],
                          }}
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-200">
                          {capitalize(key)}
                        </span>
                        <span
                          className={cx(
                            'text-sm text-gray-900 dark:text-gray-200 ml-auto tabular-nums',
                          )}
                        >
                          {statusCounts[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          }}
        </DFAwait>
      </Suspense>
    </Card>
  );
};

const PostureCloudScanResults = () => {
  const { mode } = useTheme();

  return (
    <>
      <HeaderComponent />
      <div className="grid grid-cols-[400px_1fr] p-2 gap-x-2">
        <div className="self-start grid gap-y-2">
          <StatusCountComponent theme={mode} />
        </div>
        <ScanResultTable />
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  action,
  loader,
  element: <PostureCloudScanResults />,
};
