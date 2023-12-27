import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { capitalize } from 'lodash-es';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionFunctionArgs,
  generatePath,
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
  CircleSpinner,
  ColumnDef,
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
  Tabs,
} from 'ui-components';

import { getCloudNodesApiClient, getScanResultsApiClient } from '@/api/api';
import {
  ModelBulkDeleteScansRequestScanTypeEnum,
  ModelCloudNodeAccountInfo,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ConfigureScanModal } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import {
  ICloudAccountType,
  SearchableCloudAccountsList,
} from '@/components/forms/SearchableCloudAccountsList';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { FilterIcon } from '@/components/icons/common/Filter';
import { PlusIcon } from '@/components/icons/common/Plus';
import { RefreshIcon } from '@/components/icons/common/Refresh';
import { TimesIcon } from '@/components/icons/common/Times';
import { TrashLineIcon } from '@/components/icons/common/TrashLine';
import { CLOUDS } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { StopScanForm } from '@/components/scan-configure-forms/StopScanForm';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { TruncatedText } from '@/components/TruncatedText';
import { getColorForCompliancePercent } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import {
  isNonCloudProvider,
  providersToNameMapping,
} from '@/features/postures/pages/Posture';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import {
  ComplianceScanNodeTypeEnum,
  isCloudNode,
  isCloudOrgNode,
  ScanTypeEnum,
} from '@/types/common';
import { get403Message, getResponseErrors } from '@/utils/403';
import { apiWrapper } from '@/utils/api';
import { formatPercentage } from '@/utils/number';
import {
  COMPLIANCE_SCAN_STATUS_GROUPS,
  ComplianceScanGroupedStatus,
  isNeverScanned,
  isScanComplete,
  isScanInProgress,
  isScanStopping,
  SCAN_STATUS_GROUPS,
} from '@/utils/scan';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

enum ActionEnumType {
  DELETE = 'delete',
  REFRESH_ACCOUNT = 'refresh_account',
  START_SCAN = 'start_scan',
}

export const getNodeTypeByProviderName = (
  providerName: string,
): ComplianceScanNodeTypeEnum | undefined => {
  switch (providerName) {
    case 'linux':
    case 'host':
      return ComplianceScanNodeTypeEnum.host;
    case 'aws':
      return ComplianceScanNodeTypeEnum.aws;
    case 'aws_org':
      return ComplianceScanNodeTypeEnum.aws_org;
    case 'gcp':
      return ComplianceScanNodeTypeEnum.gcp;
    case 'gcp_org':
      return ComplianceScanNodeTypeEnum.gcp_org;
    case 'azure':
      return ComplianceScanNodeTypeEnum.azure;
    case 'kubernetes':
      return ComplianceScanNodeTypeEnum.kubernetes_cluster;
    default:
      return;
  }
};

export interface AccountData {
  id: string;
  accountType: string;
  scanStatus: string;
  active?: boolean;
  compliancePercentage?: number;
}

const DEFAULT_PAGE_SIZE = 10;

const action = async ({
  request,
}: ActionFunctionArgs): Promise<{ success?: boolean; message?: string } | null> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');
  const scanIds = formData.getAll('scanId');
  const accountIds = formData.getAll('accountId[]') as string[];
  const scanType = formData.get('scanType') as ModelBulkDeleteScansRequestScanTypeEnum;
  if (!actionType) {
    throw new Error('Invalid action');
  }

  if (actionType === ActionEnumType.DELETE) {
    if (scanIds.length === 0) {
      throw new Error('Scan ids are required for deletion');
    }
    const deleteScanResultsForScanIDApi = apiWrapper({
      fn: getScanResultsApiClient().bulkDeleteScans,
    });
    const result = await deleteScanResultsForScanIDApi({
      modelBulkDeleteScansRequest: {
        filters: {
          compare_filter: null,
          contains_filter: {
            filter_in: {
              node_id: scanIds,
            },
          },
          order_filter: { order_fields: [] },
          match_filter: { filter_in: {} },
        },
        scan_type: scanType,
      },
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        const { message } = await getResponseErrors(result.error);
        return {
          success: false,
          message,
        };
      } else if (result.error.response.status === 403) {
        const message = await get403Message(result.error);
        return {
          message,
        };
      }
      throw result.error;
    }
  } else if (actionType === ActionEnumType.REFRESH_ACCOUNT) {
    const refreshCloudNodeAccountApi = apiWrapper({
      fn: getCloudNodesApiClient().refreshCloudNodeAccount,
    });
    const refreshAccountRresult = await refreshCloudNodeAccountApi({
      modelCloudAccountRefreshReq: {
        node_ids: accountIds,
      },
    });
    if (!refreshAccountRresult.ok) {
      if (refreshAccountRresult.error.response.status === 400) {
        const { message } = await getResponseErrors(refreshAccountRresult.error);
        return {
          success: false,
          message,
        };
      } else if (refreshAccountRresult.error.response.status === 403) {
        const message = await get403Message(refreshAccountRresult.error);
        return {
          message,
        };
      }
      throw refreshAccountRresult.error;
    }
  }
  invalidateAllQueries();
  return {
    success: true,
  };
};

const usePostureAccounts = () => {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const nodeType = params?.nodeType ?? '';
  return useSuspenseQuery({
    ...queries.posture.postureAccounts({
      page: getPageFromSearchParams(searchParams),
      pageSize: parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE)),
      order: getOrderFromSearchParams(searchParams),
      status: searchParams.getAll('status'),
      complianceScanStatus: searchParams.get('complianceScanStatus') as
        | ComplianceScanGroupedStatus
        | undefined,
      nodeType,
      org_accounts: searchParams.getAll('org_accounts'),
    }),
    keepPreviousData: true,
  });
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  complianceScanStatus: 'Posture scan status',
  status: 'Status',
  org_accounts: 'Organization accounts',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
  const { nodeType } = useParams() as {
    nodeType: string;
  };
  const [searchParams, setSearchParams] = useSearchParams();

  const [status, setStatus] = useState('');
  const [complianceScanStatusSearchText, setComplianceScanStatusSearchText] =
    useState('');
  const appliedFilterCount = getAppliedFiltersCount(searchParams);

  return (
    <div className="px-4 py-2.5 mb-4 border dark:border-bg-hover-3 rounded-[5px] overflow-hidden dark:bg-bg-left-nav">
      <div className="flex gap-2">
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
            setStatus(query);
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
          {['active', 'inactive']
            .filter((item) => {
              if (!status.length) return true;
              return item.includes(status.toLowerCase());
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
          value={
            searchParams.get('complianceScanStatus')
              ? SCAN_STATUS_GROUPS.find((groupStatus) => {
                  return groupStatus.value === searchParams.get('complianceScanStatus');
                })
              : null
          }
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
        {(nodeType === 'aws' || nodeType === 'gcp') && (
          <SearchableCloudAccountsList
            displayValue={`${nodeType.toUpperCase()} organization accounts`}
            valueKey="nodeId"
            cloudProvider={`${nodeType}_org` as ICloudAccountType}
            defaultSelectedAccounts={searchParams.getAll('org_accounts')}
            onClearAll={() => {
              setSearchParams((prev) => {
                prev.delete('org_accounts');
                return prev;
              });
            }}
            onChange={(value) => {
              setSearchParams((prev) => {
                prev.delete('org_accounts');
                value.forEach((id) => {
                  prev.append('org_accounts', id);
                });
                return prev;
              });
            }}
          />
        )}
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
const DeleteConfirmationModal = ({
  showDialog,
  scanIds,
  scanType,
  setShowDialog,
  onSuccess,
}: {
  showDialog: boolean;
  scanIds: string[];
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  scanType?: ModelBulkDeleteScansRequestScanTypeEnum;
  onSuccess: () => void;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      scanIds.forEach((scanId) => formData.append('scanId', scanId));
      formData.append('scanType', scanType ?? '');
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [scanIds, scanType, fetcher],
  );

  useEffect(() => {
    if (
      fetcher.state === 'idle' &&
      fetcher.data?.success &&
      fetcher.data.action === ActionEnumType.DELETE
    ) {
      onSuccess();
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
            Delete scan
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
          <span>The selected account scan will be deleted.</span>
          <br />
          <span>Are you sure you want to delete?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Deleted successfully!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({
  nodeType,
  scanType,
  trigger,
  row,
  onTableAction,
}: {
  trigger: React.ReactNode;
  nodeType?: string;
  scanType: ScanTypeEnum;
  row: ModelCloudNodeAccountInfo;
  onTableAction: (ids: string[], actionType: ActionEnumType) => void;
}) => {
  const fetcher = useFetcher();
  const {
    last_scan_id: scanId = '',
    node_id: nodeId,
    last_scan_status: scanStatus = '',
    active,
  } = row;
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { downloadScan } = useDownloadScan((state) => {
    setIsSubmitting(state === 'submitting');
  });
  const [openStopScanModal, setOpenStopScanModal] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const onDownloadAction = useCallback(() => {
    downloadScan({
      scanId,
      nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
      scanType:
        (scanType as ScanTypeEnum) === ScanTypeEnum.CloudComplianceScan
          ? UtilsReportFiltersScanTypeEnum.CloudCompliance
          : UtilsReportFiltersScanTypeEnum.Compliance,
    });
  }, [scanId, nodeType, downloadScan, scanType]);

  useEffect(() => {
    if (fetcher.state === 'idle') setOpen(false);
  }, [fetcher]);

  if (!nodeType || !nodeId) {
    throw new Error('Node type and Node id are required');
  }

  return (
    <>
      {openStopScanModal && (
        <StopScanForm
          open={openStopScanModal}
          closeModal={setOpenStopScanModal}
          scanIds={[scanId]}
          scanType={scanType}
        />
      )}
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanIds={[scanId]}
          scanType={
            (scanType as ScanTypeEnum) === ScanTypeEnum.ComplianceScan
              ? ModelBulkDeleteScansRequestScanTypeEnum.Compliance
              : ModelBulkDeleteScansRequestScanTypeEnum.CloudCompliance
          }
          setShowDialog={setShowDeleteDialog}
          onSuccess={() => {
            //
          }}
        />
      )}
      <Dropdown
        triggerAsChild
        align="start"
        open={open}
        onOpenChange={setOpen}
        content={
          <>
            <DropdownItem
              disabled={
                !active || isScanInProgress(scanStatus) || isScanStopping(scanStatus)
              }
              onSelect={() => {
                if (!nodeId) {
                  throw new Error('Node id is required to start scan');
                }
                onTableAction([nodeId], ActionEnumType.START_SCAN);
              }}
            >
              Start scan
            </DropdownItem>
            <DropdownItem
              onSelect={(e) => {
                e.preventDefault();
                setOpenStopScanModal(true);
              }}
              disabled={!isScanInProgress(scanStatus)}
            >
              <span className="flex items-center">Cancel scan</span>
            </DropdownItem>
            <DropdownItem
              disabled={!isScanComplete(scanStatus)}
              onClick={(e) => {
                if (!isScanComplete(scanStatus)) return;
                e.preventDefault();
                onDownloadAction();
              }}
            >
              <span className="flex text-center gap-x-2">
                {isSubmitting && <CircleSpinner size="sm" />} Download latest report
              </span>
            </DropdownItem>
            <DropdownItem
              disabled={!scanId || !nodeType}
              onClick={() => {
                if (!scanId || !nodeType) return;
                setShowDeleteDialog(true);
              }}
            >
              <span
                className={cn('flex items-center gap-x-2', {
                  'text-red-700 dark:text-status-error': scanId,
                  'dark:text-df-gray-600': !scanId || !nodeType,
                })}
              >
                Delete latest scan
              </span>
            </DropdownItem>
            <DropdownItem
              onSelect={() => {
                if (!nodeId) {
                  throw new Error('Account id is required to refresh');
                }
                onTableAction([nodeId], ActionEnumType.REFRESH_ACCOUNT);
              }}
            >
              Refresh account
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
  onClick,
  onDelete,
  onRefreshAccount,
  onCancelScan,
  disableStartScan,
  disableCancelScan,
  disableDeleteScan,
  disableRefreshAccount,
}: {
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  onCancelScan?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  onDelete?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  onRefreshAccount?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  disableStartScan: boolean;
  disableCancelScan: boolean;
  disableDeleteScan: boolean;
  disableRefreshAccount: boolean;
}) => {
  const { navigate } = usePageNavigation();
  const params = useParams();

  return (
    <>
      <Button
        color="default"
        variant="flat"
        size="sm"
        startIcon={<PlusIcon />}
        onClick={() => {
          if (!params?.nodeType) {
            toast.error('Provide correct posture account');
            return;
          }
          navigate(
            generatePath('/posture/add-connection/:account', {
              account: encodeURIComponent(params.nodeType ?? ''),
            }),
          );
        }}
      >
        ADD NEW ACCOUNT
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        disabled={disableStartScan}
        onClick={onClick}
      >
        Start scan
      </Button>
      <Button
        color="default"
        variant="flat"
        size="sm"
        disabled={disableCancelScan}
        onClick={onCancelScan}
      >
        Cancel scan
      </Button>
      <Button
        color="error"
        variant="flat"
        startIcon={<TrashLineIcon />}
        size="sm"
        disabled={disableDeleteScan}
        onClick={onDelete}
      >
        Delete scan
      </Button>
      <Button
        variant="flat"
        startIcon={<RefreshIcon />}
        size="sm"
        disabled={disableRefreshAccount}
        onClick={onRefreshAccount}
      >
        Refresh account
      </Button>
    </>
  );
};

const AccountTable = ({
  setRowSelectionState,
  rowSelectionState,
  onTableAction,
  scanType,
  nodeType,
}: {
  nodeType?: ComplianceScanNodeTypeEnum;
  scanType: 'ComplianceScan' | 'CloudComplianceScan';
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  rowSelectionState: RowSelectionState;
  onTableAction: (ids: string[], actionType: ActionEnumType) => void;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = usePostureAccounts();

  const [sort, setSort] = useSortingState();

  const columnHelper = createColumnHelper<ModelCloudNodeAccountInfo>();

  const accounts = data?.accounts ?? [];
  const columnWidth = nodeType?.endsWith('_org')
    ? {
        node_name: {
          minSize: 40,
          size: 60,
          maxSize: 100,
        },
        compliance_percentage: {
          minSize: 30,
          size: 40,
          maxSize: 60,
        },
        active: {
          minSize: 40,
          size: 40,
          maxSize: 40,
        },
        last_scan_status: {
          minSize: 120,
          size: 140,
          maxSize: 160,
        },
        version: {
          minSize: 30,
          size: 40,
          maxSize: 60,
        },
      }
    : {
        node_name: {
          minSize: 80,
          size: 90,
          maxSize: 100,
        },
        compliance_percentage: {
          minSize: 60,
          size: 60,
          maxSize: 70,
        },
        active: {
          minSize: 40,
          size: 40,
          maxSize: 40,
        },
        last_scan_status: {
          minSize: 50,
          size: 70,
          maxSize: 80,
        },
        version: {
          minSize: 50,
          size: 70,
          maxSize: 80,
        },
      };

  const columns = useMemo(() => {
    const columns: ColumnDef<ModelCloudNodeAccountInfo, any>[] = [
      getRowSelectionColumn(columnHelper, {
        minSize: 15,
        size: 15,
        maxSize: 15,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          return (
            <ActionDropdown
              row={cell.row.original}
              nodeType={nodeType}
              scanType={scanType}
              onTableAction={onTableAction}
              trigger={
                <button className="p-1 flex">
                  <span className="block h-4 w-4 dark:text-text-text-and-icon rotate-90 shrink-0">
                    <EllipsisIcon />
                  </span>
                </button>
              }
            />
          );
        },
        header: () => '',
        size: 20,
        minSize: 20,
        maxSize: 20,
        enableResizing: false,
      }),
      columnHelper.accessor('node_name', {
        cell: (cell) => {
          const isNeverScan = cell.row.original.last_scan_status?.toLowerCase() === '';
          const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
            let path = '/posture/scan-results/:nodeType/:scanId';

            if (
              cell.row.original.cloud_provider &&
              CLOUDS.includes(
                cell.row.original.cloud_provider as ComplianceScanNodeTypeEnum,
              )
            ) {
              path = '/posture/cloud/scan-results/:nodeType/:scanId';
            }
            const redirectUrl = generatePath(`${path}`, {
              scanId: encodeURIComponent(cell.row.original.last_scan_id ?? ''),
              nodeType: cell.row.original.cloud_provider ?? '',
            });
            return isNeverScan ? (
              <span>{children}</span>
            ) : (
              <DFLink to={redirectUrl}>{children}</DFLink>
            );
          };
          return (
            <WrapperComponent>
              <div className="flex items-center gap-x-2 truncate">
                <span className="truncate">{cell.getValue()}</span>
              </div>
            </WrapperComponent>
          );
        },
        header: () => 'Account',
        ...columnWidth.node_name,
      }),
      columnHelper.accessor('compliance_percentage', {
        ...columnWidth.compliance_percentage,
        header: () => 'Compliance %',
        cell: (cell) => {
          const percent = Number(cell.getValue());
          const isScanned = !!cell.row.original.last_scan_status;

          if (isScanned) {
            return (
              <span
                style={{
                  color: getColorForCompliancePercent(percent),
                }}
              >
                {formatPercentage(percent, {
                  maximumFractionDigits: 1,
                })}
              </span>
            );
          } else {
            return <span>Unknown</span>;
          }
        },
      }),
      columnHelper.accessor('active', {
        ...columnWidth.active,
        header: () => 'Active',
        cell: (info) => {
          return info.getValue() ? 'Yes' : 'No';
        },
      }),
      columnHelper.accessor('last_scan_status', {
        cell: (info) => {
          if (nodeType?.endsWith?.('_org')) {
            const data = info.row.original.scan_status_map ?? {};
            const keys = Object.keys(data);
            const statuses = Object.keys(data).map((current, index) => {
              const scanStatus = COMPLIANCE_SCAN_STATUS_GROUPS.neverScanned.includes(
                current,
              )
                ? ''
                : current;
              return (
                <>
                  <div className="flex gap-x-1.5 items-center" key={current}>
                    <span className="dark:text-text-input-value font-medium">
                      {data[current]}
                    </span>
                    <ScanStatusBadge status={scanStatus ?? ''} />
                    {index < keys.length - 1 ? (
                      <div className="mx-2 w-px h-[20px] dark:bg-bg-grid-border" />
                    ) : null}
                  </div>
                </>
              );
            });
            return <div className="flex gap-x-1.5">{statuses}</div>;
          } else {
            const value = info.getValue();
            return <ScanStatusBadge status={value ?? ''} />;
          }
        },
        header: () => 'Status',
        ...columnWidth.last_scan_status,
      }),
    ];

    if (isCloudNode(nodeType) || isCloudOrgNode(nodeType)) {
      columns.push(
        columnHelper.accessor('version', {
          enableSorting: false,
          cell: (info) => {
            return <TruncatedText text={info.getValue() ?? ''} />;
          },
          header: () => 'Version',
          ...columnWidth.version,
        }),
      );
    }

    return columns;
  }, [rowSelectionState, searchParams, data, nodeType]);

  return (
    <>
      <div>
        <Table
          size="default"
          data={accounts ?? []}
          columns={columns}
          enablePagination
          manualPagination
          totalRows={data?.totalRows ?? 0}
          pageSize={parseInt(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE))}
          pageIndex={data?.currentPage ?? 0}
          onPaginationChange={(updaterOrValue) => {
            let newPageIndex = 0;
            if (typeof updaterOrValue === 'function') {
              newPageIndex = updaterOrValue({
                pageIndex: data?.currentPage ?? 0,
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
          approximatePagination
          enableRowSelection
          rowSelectionState={rowSelectionState}
          onRowSelectionChange={setRowSelectionState}
          getRowId={(row) => {
            return JSON.stringify({
              scanId: row.last_scan_id,
              nodeId: row.node_id,
              nodeType: row.cloud_provider,
              active: row.active,
              scanStatus: row.last_scan_status,
            });
          }}
          enableColumnResizing
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
          enablePageResize
          onPageResize={(newSize) => {
            setSearchParams((prev) => {
              prev.set('size', String(newSize));
              prev.delete('page');
              return prev;
            });
          }}
          noDataElement={
            <TableNoDataElement text="No accounts available, please add new account" />
          }
        />
      </div>
    </>
  );
};

const Header = () => {
  const routeParams = useParams() as {
    nodeType: string;
  };
  const isFetching = useIsFetching({
    queryKey: queries.posture.postureAccounts._def,
  });

  return (
    <div className="flex pl-4 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
      <Breadcrumb>
        <BreadcrumbLink asChild icon={<PostureIcon />} isLink>
          <DFLink to={'/posture'} unstyled>
            Posture
          </DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink>
          <span className="inherit cursor-auto">
            {providersToNameMapping[routeParams.nodeType]}
          </span>
        </BreadcrumbLink>
      </Breadcrumb>
      <div className="ml-2 flex items-center">
        {isFetching ? <CircleSpinner size="sm" /> : null}
      </div>
    </div>
  );
};
const Accounts = () => {
  const [searchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});

  const [selectedScanType, setSelectedScanType] = useState<
    typeof ScanTypeEnum.ComplianceScan | typeof ScanTypeEnum.CloudComplianceScan
  >();

  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const fetcher = useFetcher();
  const routeParams = useParams() as {
    nodeType: string;
  };

  const nodeType = getNodeTypeByProviderName(
    routeParams.nodeType as ComplianceScanNodeTypeEnum,
  );

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelScan, setShowCancelScan] = useState(false);
  const [nodeIdsToScan, setNodeIdsToScan] = useState<string[]>([]);

  const scanType = isNonCloudProvider(routeParams.nodeType)
    ? ScanTypeEnum.ComplianceScan
    : ScanTypeEnum.CloudComplianceScan;

  const selectedRows = useMemo<
    {
      scanId: string;
      nodeId: string;
      nodeType: string;
      active: boolean;
      scanStatus: string;
    }[]
  >(() => {
    return Object.keys(rowSelectionState).map((item) => {
      return JSON.parse(item);
    });
  }, [rowSelectionState]);

  const nodeIdsToDeleteScan = useMemo(() => {
    return selectedRows
      .filter((row) => !isNeverScanned(row.scanStatus))
      .map((row) => row.scanId);
  }, [selectedRows]);

  const nodeIdsToCancelScan = useMemo(() => {
    return selectedRows
      .filter((row) => isScanInProgress(row.scanStatus))
      .map((row) => row.scanId);
  }, [selectedRows]);

  useEffect(() => {
    setNodeIdsToScan(
      selectedRows
        .filter(
          (node) =>
            node.active &&
            !isScanInProgress(node.scanStatus) &&
            !isScanStopping(node.scanStatus),
        )
        .map((node) => node.nodeId),
    );
  }, [selectedRows]);

  const onTableAction = useCallback(
    (nodeIds: string[], actionType: ActionEnumType) => {
      if (actionType === ActionEnumType.START_SCAN) {
        setNodeIdsToScan(nodeIds);
        setSelectedScanType(scanType);
        return;
      } else if (actionType === ActionEnumType.REFRESH_ACCOUNT) {
        const formData = new FormData();
        formData.append('actionType', ActionEnumType.REFRESH_ACCOUNT);
        nodeIds.forEach((nodeId) => formData.append('accountId[]', nodeId));
        fetcher.submit(formData, {
          method: 'post',
        });
        return;
      }
    },
    [fetcher],
  );

  return (
    <div>
      {!hasOrgCloudAccount(nodeType ?? '') ? <Header /> : null}
      {showCancelScan && (
        <StopScanForm
          open={true}
          closeModal={setShowCancelScan}
          scanIds={nodeIdsToCancelScan}
          scanType={scanType}
          onCancelScanSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
      <div className="mb-4 mx-4">
        <div className="flex h-12 items-center">
          <BulkActions
            disableStartScan={nodeIdsToScan.length == 0}
            disableCancelScan={nodeIdsToCancelScan.length === 0}
            disableDeleteScan={nodeIdsToDeleteScan.length === 0}
            disableRefreshAccount={selectedRows.length === 0}
            onRefreshAccount={() => {
              const formData = new FormData();
              formData.append('actionType', ActionEnumType.REFRESH_ACCOUNT);
              selectedRows.forEach((row) => formData.append('accountId[]', row.nodeId));
              fetcher.submit(formData, {
                method: 'post',
              });
            }}
            onClick={() => {
              setSelectedScanType(scanType);
            }}
            onCancelScan={() => {
              setShowCancelScan(true);
            }}
            onDelete={() => {
              setShowDeleteDialog(true);
            }}
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
        <ConfigureScanModal
          open={!!selectedScanType}
          onOpenChange={() => setSelectedScanType(undefined)}
          onSuccess={() => setRowSelectionState({})}
          scanOptions={
            selectedScanType && nodeType
              ? {
                  showAdvancedOptions: true,
                  scanType: selectedScanType,
                  data: {
                    nodeIds: nodeIdsToScan,
                    nodeType: nodeType,
                  },
                }
              : undefined
          }
        />

        <Suspense fallback={<TableSkeleton columns={6} rows={10} />}>
          <AccountTable
            setRowSelectionState={setRowSelectionState}
            rowSelectionState={rowSelectionState}
            onTableAction={onTableAction}
            scanType={scanType}
            nodeType={nodeType}
          />
        </Suspense>
      </div>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanIds={nodeIdsToDeleteScan}
          scanType={
            isNonCloudProvider(routeParams.nodeType)
              ? ModelBulkDeleteScansRequestScanTypeEnum.Compliance
              : ModelBulkDeleteScansRequestScanTypeEnum.CloudCompliance
          }
          setShowDialog={setShowDeleteDialog}
          onSuccess={() => {
            setRowSelectionState({});
          }}
        />
      )}
    </div>
  );
};

const tabs = [
  {
    label: 'Regular Accounts',
    value: 'accounts',
  },
  {
    label: 'Organization Accounts',
    value: 'org-accounts',
  },
];

const AccountWithTab = () => {
  const { nodeType } = useParams() as {
    nodeType: string;
  };

  const [currentTab, setTab] = useState(() => {
    return nodeType.endsWith('_org') ? 'org-accounts' : 'accounts';
  });
  const { navigate } = usePageNavigation();

  return (
    <>
      <Header />
      <Tabs
        className="mt-2"
        value={currentTab}
        tabs={tabs}
        onValueChange={(value) => {
          if (currentTab === value) return;
          let _nodeType = nodeType;
          if (value === 'org-accounts') {
            _nodeType = _nodeType + '_org';
          } else {
            _nodeType = _nodeType.split('_')[0];
          }
          setTab(value);
          navigate(
            generatePath('/posture/accounts/:nodeType', {
              nodeType: _nodeType,
            }),
          );
        }}
        size="md"
      >
        <div className="mt-2">
          <Accounts key={nodeType} />
        </div>
      </Tabs>
    </>
  );
};

const ConditionalAccount = () => {
  const { nodeType } = useParams() as {
    nodeType: string;
  };

  if (hasOrgCloudAccount(nodeType)) {
    return <AccountWithTab />;
  }
  return <Accounts />;
};

const hasOrgCloudAccount = (nodeType: string) => {
  return nodeType.startsWith('aws') || nodeType.startsWith('gcp');
};

export const module = {
  action,
  element: <ConditionalAccount />,
};
