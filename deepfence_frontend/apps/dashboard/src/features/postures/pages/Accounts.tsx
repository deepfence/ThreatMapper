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
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
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
  TableSkeleton,
} from 'ui-components';

import { getScanResultsApiClient } from '@/api/api';
import {
  ModelCloudNodeAccountInfo,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ConfigureScanModal } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterBadge } from '@/components/filters/FilterBadge';
import { EllipsisIcon } from '@/components/icons/common/Ellipsis';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { FilterIcon } from '@/components/icons/common/Filter';
import { PlusIcon } from '@/components/icons/common/Plus';
import { TimesIcon } from '@/components/icons/common/Times';
import { CLOUDS } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { getColorForCompliancePercent } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import {
  isNonCloudProvider,
  providersToNameMapping,
} from '@/features/postures/pages/Posture';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries, queries } from '@/queries';
import { ComplianceScanNodeTypeEnum, ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { formatPercentage } from '@/utils/number';
import {
  ComplianceScanGroupedStatus,
  isScanComplete,
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
  const scanId = formData.get('scanId');
  const scanType = formData.get('scanType');
  if (!actionType) {
    throw new Error('Invalid action');
  }

  if (actionType === ActionEnumType.DELETE) {
    if (!scanId) {
      throw new Error('Invalid action');
    }
    const deleteScanResultsForScanIDApi = apiWrapper({
      fn: getScanResultsApiClient().deleteScanResultsForScanID,
    });
    const result = await deleteScanResultsForScanIDApi({
      scanId: scanId.toString(),
      scanType: scanType as ScanTypeEnum,
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        return {
          success: false,
          message: result.error.message,
        };
      } else if (result.error.response.status === 403) {
        return {
          message: 'You do not have enough permissions to delete scan',
        };
      }
    }

    invalidateAllQueries();
    return {
      success: true,
    };
  }
  return null;
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
    }),
    keepPreviousData: true,
  });
};

const FILTER_SEARCHPARAMS: Record<string, string> = {
  complianceScanStatus: 'Posture scan status',
  status: 'Status',
};

const getAppliedFiltersCount = (searchParams: URLSearchParams) => {
  return Object.keys(FILTER_SEARCHPARAMS).reduce((prev, curr) => {
    return prev + searchParams.getAll(curr).length;
  }, 0);
};
const Filters = () => {
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
  scanId,
  scanType,
  setShowDialog,
}: {
  showDialog: boolean;
  scanId: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
  scanType?: ScanTypeEnum;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('scanId', scanId);
      formData.append('scanType', scanType ?? '');
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [scanId, scanType, fetcher],
  );

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
            Delete account
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
          <span>The selected account will be deleted.</span>
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

const ActionDropdown = ({
  scanId,
  scanStatus,
  nodeType,
  scanType,
  nodeId,
  trigger,
  setShowDeleteDialog,
  onTableAction,
  setScanIdToDelete,
}: {
  trigger: React.ReactNode;
  scanId?: string;
  nodeType?: string;
  scanType: ScanTypeEnum;
  scanStatus: string;
  nodeId?: string;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  onTableAction: (ids: string[], actionType: ActionEnumType) => void;
  setScanIdToDelete: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const { downloadScan } = useDownloadScan();

  const onDownloadAction = useCallback(() => {
    if (!scanId || !nodeType) return;
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

  return (
    <Dropdown
      triggerAsChild
      align="start"
      open={open}
      onOpenChange={setOpen}
      content={
        <>
          <DropdownItem
            onClick={() => {
              if (!nodeId) {
                throw new Error('Node id is required to start scan');
              }
              onTableAction([nodeId], ActionEnumType.START_SCAN);
            }}
          >
            Start Scan
          </DropdownItem>
          <DropdownItem
            disabled={!isScanComplete(scanStatus)}
            onClick={(e) => {
              if (!isScanComplete(scanStatus)) return;
              e.preventDefault();
              onDownloadAction();
            }}
          >
            Download Latest Report
          </DropdownItem>
          <DropdownItem
            disabled={!scanId || !nodeType}
            onClick={() => {
              if (!scanId || !nodeType) return;
              setScanIdToDelete(scanId);
              setShowDeleteDialog(true);
            }}
          >
            <span className="flex items-center gap-x-2 text-red-700 dark:text-status-error">
              Delete Latest Scan
            </span>
          </DropdownItem>
        </>
      }
    >
      {trigger}
    </Dropdown>
  );
};

const BulkActions = ({
  onClick,
  disabled,
}: {
  onClick?: React.MouseEventHandler<HTMLButtonElement> | undefined;
  disabled: boolean;
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
        disabled={disabled}
        onClick={onClick}
      >
        Start scan
      </Button>
    </>
  );
};

const AccountTable = ({
  setRowSelectionState,
  rowSelectionState,
  onTableAction,
  scanType,
  setShowDeleteDialog,
  setScanIdToDelete,
}: {
  scanType: 'ComplianceScan' | 'CloudComplianceScan';
  setRowSelectionState: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  rowSelectionState: RowSelectionState;
  onTableAction: (ids: string[], actionType: ActionEnumType) => void;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setScanIdToDelete: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data } = usePostureAccounts();

  const [sort, setSort] = useSortingState();

  const columnHelper = createColumnHelper<ModelCloudNodeAccountInfo>();

  const accounts = data?.accounts ?? [];
  const cloudProvider = accounts[0]?.cloud_provider ?? '';

  const nodeType = getNodeTypeByProviderName(cloudProvider);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 10,
        size: 10,
        maxSize: 10,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          return (
            <ActionDropdown
              scanId={cell.row.original.last_scan_id}
              nodeId={cell.row.original.node_id}
              nodeType={nodeType}
              scanType={scanType}
              setScanIdToDelete={setScanIdToDelete}
              scanStatus={cell.row.original.last_scan_status || ''}
              onTableAction={onTableAction}
              setShowDeleteDialog={setShowDeleteDialog}
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
              scanId: cell.row.original.last_scan_id ?? '',
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
        minSize: 80,
        size: 90,
        maxSize: 100,
      }),
      columnHelper.accessor('compliance_percentage', {
        minSize: 60,
        size: 60,
        maxSize: 70,
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
        minSize: 40,
        size: 40,
        maxSize: 40,
        header: () => 'Active',
        cell: (info) => {
          return info.getValue() ? 'Yes' : 'No';
        },
      }),
      columnHelper.accessor('last_scan_status', {
        cell: (info) => {
          const value = info.getValue();
          return <ScanStatusBadge status={value ?? ''} />;
        },
        header: () => 'Status',
        minSize: 50,
        size: 70,
        maxSize: 80,
      }),
    ],
    [rowSelectionState, searchParams, data],
  );

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
          getRowId={(row) => row.node_id ?? ''}
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
    <div className="flex pl-6 pr-4 py-2 w-full items-center bg-white dark:bg-bg-breadcrumb-bar">
      <Breadcrumb>
        <BreadcrumbLink asChild icon={<PostureIcon />} isLink>
          <DFLink to={'/posture'} unstyled>
            Posture
          </DFLink>
        </BreadcrumbLink>
        <BreadcrumbLink icon={<PostureIcon />}>
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
  const [scanIdToDelete, setScanIdToDelete] = useState('');
  const [nodeIdsToScan, setNodeIdsToScan] = useState<string[]>([]);

  const scanType = isNonCloudProvider(routeParams.nodeType)
    ? ScanTypeEnum.ComplianceScan
    : ScanTypeEnum.CloudComplianceScan;

  useEffect(() => {
    setNodeIdsToScan(Object.keys(rowSelectionState));
  }, [rowSelectionState]);

  const onTableAction = useCallback(
    (nodeIds: string[], actionType: ActionEnumType) => {
      if (actionType === ActionEnumType.START_SCAN) {
        setNodeIdsToScan(nodeIds);
        setSelectedScanType(scanType);
        return;
      }
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('scanId', scanIdToDelete);
      nodeIds.forEach((item) => formData.append('nodeIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [fetcher],
  );

  return (
    <div>
      <Header />
      <div className="m-4">
        <div className="flex py-2 items-center">
          <BulkActions
            disabled={Object.keys(rowSelectionState).length === 0}
            onClick={() => {
              setSelectedScanType(scanType);
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
            setScanIdToDelete={setScanIdToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
            rowSelectionState={rowSelectionState}
            onTableAction={onTableAction}
            scanType={scanType}
          />
        </Suspense>
      </div>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanId={scanIdToDelete}
          scanType={scanType}
          setShowDialog={setShowDeleteDialog}
        />
      )}
    </div>
  );
};

export const module = {
  action,
  element: <Accounts />,
};
