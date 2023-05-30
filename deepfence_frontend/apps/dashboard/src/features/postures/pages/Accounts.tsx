import cx from 'classnames';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaPlay, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import {
  HiArchive,
  HiChevronRight,
  HiDotsVertical,
  HiDownload,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import {
  ActionFunctionArgs,
  Form,
  generatePath,
  LoaderFunctionArgs,
  useFetcher,
  useLoaderData,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbLink,
  Button,
  Checkbox,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  IconButton,
  Modal,
  Popover,
  RowSelectionState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getCloudNodesApiClient, getScanResultsApiClient } from '@/api/api';
import {
  ModelCloudNodeAccountInfo,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { ConfigureScanModal } from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { CLOUDS } from '@/components/scan-configure-forms/ComplianceScanConfigureForm';
import { ScanStatusBadge } from '@/components/ScanStatusBadge';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { providersToNameMapping } from '@/features/postures/pages/Posture';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { ComplianceScanNodeTypeEnum, ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { isScanComplete } from '@/utils/scan';
import { DFAwait } from '@/utils/suspense';
import { getPageFromSearchParams } from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

enum ActionEnumType {
  DELETE = 'delete',
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

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: Awaited<ReturnType<typeof getAccounts>>;
};

const PAGE_SIZE = 15;

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

    return {
      success: true,
    };
  }
  return null;
};
export async function getAccounts(
  nodeType: string,
  searchParams: URLSearchParams,
): Promise<{
  accounts: ModelCloudNodeAccountInfo[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const page = getPageFromSearchParams(searchParams);
  // const scanResultsReq: ListCloudNodeAccountRequest = {
  //   cloud_provider: '',
  //   window: {
  //     offset: page * PAGE_SIZE,
  //     size: PAGE_SIZE,
  //   },
  // };
  // if (active.length && !active.length) {
  //   scanResultsReq.fields_filter.contains_filter.filter_in!['active'] = [
  //     active.length ? true : false,
  //   ];
  // }
  const deleteScanResultsForScanIDApi = apiWrapper({
    fn: getCloudNodesApiClient().listCloudNodeAccount,
  });
  const result = await deleteScanResultsForScanIDApi({
    modelCloudNodeAccountsListReq: {
      cloud_provider: nodeType,
      window: {
        offset: 0 * PAGE_SIZE,
        size: PAGE_SIZE,
      },
    },
  });
  if (!result.ok) {
    throw result.error;
  }

  return {
    accounts: result.value.cloud_node_accounts_info ?? [],
    currentPage: 0,
    totalRows: 15,
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const searchParams = new URL(request.url).searchParams;
  const nodeType = params.nodeType;

  if (!nodeType) {
    throw new Error('Cloud Node Type is required');
  }
  return typedDefer({
    data: getAccounts(nodeType, searchParams),
  });
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
            Selected scan will be deleted.
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
        <SuccessModalContent text="Scan deleted successfully!" />
      )}
    </Modal>
  );
};

const ActionDropdown = ({
  icon,
  scanId,
  scanStatus,
  nodeType,
  scanType,
  nodeId,
  cloudProvider,
  setShowDeleteDialog,
  setScanIdToDelete,
  setScanTypeToDelete,
  setSelectedScanType,
  setScanNodeIds,
}: {
  icon: React.ReactNode;
  scanId?: string;
  nodeType?: string;
  scanType: ScanTypeEnum;
  scanStatus: string;
  nodeId?: string;
  cloudProvider?: string;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setScanIdToDelete: React.Dispatch<React.SetStateAction<string>>;
  setScanTypeToDelete: React.Dispatch<React.SetStateAction<ScanTypeEnum | undefined>>;
  setSelectedScanType: React.Dispatch<
    React.SetStateAction<
      | typeof ScanTypeEnum.ComplianceScan
      | typeof ScanTypeEnum.CloudComplianceScan
      | undefined
    >
  >;
  setScanNodeIds: React.Dispatch<React.SetStateAction<string[] | undefined>>;
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
      align="end"
      open={open}
      onOpenChange={setOpen}
      content={
        <>
          <DropdownItem
            className="text-sm"
            onClick={() => {
              if (!nodeId) {
                throw new Error('Node id is required to start scan');
              }
              const scanType = CLOUDS.includes(
                cloudProvider as ComplianceScanNodeTypeEnum,
              )
                ? ScanTypeEnum.CloudComplianceScan
                : ScanTypeEnum.ComplianceScan;
              setSelectedScanType(scanType);
              setScanNodeIds([nodeId]);
            }}
          >
            <span className="flex items-center gap-x-2 text-blue-600 dark:text-blue-500">
              <IconContext.Provider
                value={{ className: 'text-blue-600 dark:text-blue-500' }}
              >
                <FaPlay />
              </IconContext.Provider>
              Start Scan
            </span>
          </DropdownItem>
          <DropdownItem
            className={cx('text-sm', {
              'opacity-60 dark:opacity-30 cursor-default': !isScanComplete(scanStatus),
            })}
            onClick={(e) => {
              if (!isScanComplete(scanStatus)) return;
              e.preventDefault();
              onDownloadAction();
            }}
          >
            <span
              className={cx('flex items-center gap-x-2', {
                'opacity-60 dark:opacity-30 cursor-not-allowed':
                  !isScanComplete(scanStatus),
              })}
            >
              <HiDownload />
              Download Latest Report
            </span>
          </DropdownItem>
          <DropdownItem
            className={cx('text-sm', {
              'opacity-60 dark:opacity-30 cursor-not-allowed': !scanId || !nodeType,
            })}
            onClick={() => {
              if (!scanId || !nodeType) return;
              setScanIdToDelete(scanId);
              setScanTypeToDelete(scanType);
              setShowDeleteDialog(true);
            }}
          >
            <span className="flex items-center gap-x-2 text-red-700 dark:text-red-400">
              <IconContext.Provider
                value={{ className: 'text-red-700 dark:text-red-400' }}
              >
                <HiArchive />
              </IconContext.Provider>
              Delete Latest Scan
            </span>
          </DropdownItem>
        </>
      }
    >
      <Button className="ml-auto" size="xs" color="normal">
        <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
          {icon}
        </IconContext.Provider>
      </Button>
    </Dropdown>
  );
};

const PostureTable = ({ data }: { data: LoaderDataType['data'] }) => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelCloudNodeAccountInfo>();
  const [selectedScanType, setSelectedScanType] = useState<
    typeof ScanTypeEnum.ComplianceScan | typeof ScanTypeEnum.CloudComplianceScan
  >();
  const [scanNodeIds, setScanNodeIds] = useState<string[]>();
  let accounts = data?.accounts ?? [];
  const totalRows = data?.totalRows ?? 0;
  const currentPage = data?.currentPage ?? 0;
  const cloudProvider = accounts[0]?.cloud_provider ?? '';
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scanIdToDelete, setScanIdToDelete] = useState('');
  const [scanTypeToDelete, setScanTypeToDelete] = useState<ScanTypeEnum>();

  if (searchParams.get('active')) {
    accounts = accounts.filter((account) => {
      return account.active;
    });
  }

  const nodeType = getNodeTypeByProviderName(cloudProvider);
  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
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
        minSize: 100,
        size: 120,
        maxSize: 130,
      }),
      columnHelper.accessor('compliance_percentage', {
        minSize: 80,
        size: 80,
        maxSize: 100,
        header: () => 'Compliance %',
        cell: (cell) => {
          const percent = Number(cell.getValue()) ?? 0;
          return (
            <div
              className={cx('text-md rounded-lg font-medium text-center w-fit px-2', {
                'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                  percent > 60 && percent < 100,
                'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                  percent > 30 && percent < 90,
                'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                  percent !== 0 && percent < 30,
                'text-gray-700 dark:text-gray-400': !percent,
              })}
            >
              {percent.toFixed(2)}%
            </div>
          );
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
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const scanType = CLOUDS.includes(
            cell.row.original.cloud_provider as ComplianceScanNodeTypeEnum,
          )
            ? ScanTypeEnum.CloudComplianceScan
            : ScanTypeEnum.ComplianceScan;
          return (
            <ActionDropdown
              icon={<HiDotsVertical />}
              scanId={cell.row.original.last_scan_id}
              nodeId={cell.row.original.node_id}
              nodeType={nodeType}
              scanType={scanType}
              cloudProvider={cell.row.original.cloud_provider}
              scanStatus={cell.row.original.last_scan_status || ''}
              setScanIdToDelete={setScanIdToDelete}
              setScanTypeToDelete={setScanTypeToDelete}
              setShowDeleteDialog={setShowDeleteDialog}
              setSelectedScanType={setSelectedScanType}
              setScanNodeIds={setScanNodeIds}
            />
          );
        },
        header: () => '',
        minSize: 20,
        size: 20,
        maxSize: 20,
        enableResizing: false,
      }),
    ],
    [rowSelectionState, searchParams, data],
  );

  return (
    <>
      <div>
        <ConfigureScanModal
          open={!!selectedScanType}
          onOpenChange={() => setSelectedScanType(undefined)}
          scanOptions={
            selectedScanType && nodeType
              ? {
                  showAdvancedOptions: true,
                  scanType: CLOUDS.includes(cloudProvider as ComplianceScanNodeTypeEnum)
                    ? ScanTypeEnum.CloudComplianceScan
                    : ScanTypeEnum.ComplianceScan,
                  data: {
                    nodeIds: scanNodeIds ?? [],
                    nodeType: nodeType,
                  },
                }
              : undefined
          }
        />
        <Form>
          {Object.keys(rowSelectionState).length === 0 ? (
            <>
              {accounts.length > 0 && (
                <div className="text-sm text-gray-400 font-medium pt-2 pb-1 flex justify-between">
                  No rows selected
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-1.5 flex gap-x-2">
                <Button
                  size="xxs"
                  color="primary"
                  outline
                  onClick={() => {
                    const scanType = CLOUDS.includes(
                      cloudProvider as ComplianceScanNodeTypeEnum,
                    )
                      ? ScanTypeEnum.CloudComplianceScan
                      : ScanTypeEnum.ComplianceScan;
                    setSelectedScanType(scanType);
                    setScanNodeIds(Object.keys(rowSelectionState));
                  }}
                >
                  Start Scan
                </Button>
              </div>
            </>
          )}
        </Form>
        {showDeleteDialog && (
          <DeleteConfirmationModal
            showDialog={showDeleteDialog}
            scanId={scanIdToDelete}
            scanType={scanTypeToDelete}
            setShowDialog={setShowDeleteDialog}
          />
        )}
        <Table
          size="sm"
          data={accounts ?? []}
          columns={columns}
          enableRowSelection
          rowSelectionState={rowSelectionState}
          onRowSelectionChange={setRowSelectionState}
          getRowId={(row) => row.node_id ?? ''}
          enableColumnResizing
          enableSorting
        />
      </div>
    </>
  );
};

const Accounts = () => {
  const elementToFocusOnClose = useRef(null);
  const loaderData = useLoaderData() as LoaderDataType;
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams() as {
    nodeType: string;
  };
  const { navigate } = usePageNavigation();
  const isFilterApplied = searchParams.has('');

  const onResetFilters = () => {
    setSearchParams(() => {
      return {};
    });
  };

  return (
    <div>
      <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <Breadcrumb separator={<HiChevronRight />} transparent>
          <BreadcrumbLink>
            <DFLink to={'/posture'}>Posture</DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">
              {providersToNameMapping[routeParams.nodeType]}
            </span>
          </BreadcrumbLink>
        </Breadcrumb>
        <div className="ml-auto flex relative gap-x-4">
          <div className="ml-auto">
            <Button
              size="xs"
              startIcon={<FaPlus />}
              color="primary"
              outline
              onClick={() => {
                navigate(`/posture/add-connection/${routeParams.nodeType}`);
              }}
            >
              Add {routeParams.nodeType === ACCOUNT_CONNECTOR.KUBERNETES && 'Cluster'}
              {routeParams.nodeType === ACCOUNT_CONNECTOR.LINUX && 'Host'}
              {routeParams.nodeType !== ACCOUNT_CONNECTOR.KUBERNETES &&
                routeParams.nodeType !== ACCOUNT_CONNECTOR.LINUX &&
                'Account'}
            </Button>
          </div>
          <div>
            {isFilterApplied && (
              <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            )}

            <Popover
              triggerAsChild
              elementToFocusOnCloseRef={elementToFocusOnClose}
              content={
                <div className="dark:text-white w-[300px]">
                  <FilterHeader onReset={onResetFilters} />
                  <div className="flex flex-col gap-y-6 p-4">
                    <fieldset>
                      <legend className="text-sm font-medium">Status</legend>
                      <div className="flex gap-x-4 mt-1">
                        <Checkbox
                          label="Active"
                          checked={searchParams.get('active') === 'true'}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.delete('active');
                                prev.delete('page');
                                prev.append('active', 'true');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                prev.delete('page');
                                prev.delete('active');
                                return prev;
                              });
                            }
                          }}
                        />
                      </div>
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
          </div>
        </div>
      </div>

      <div className="px-1 mt-2">
        <Suspense fallback={<TableSkeleton columns={6} rows={10} size={'md'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              return <PostureTable data={resolvedData} />;
            }}
          </DFAwait>
        </Suspense>
      </div>
    </div>
  );
};

export const module = {
  loader,
  action,
  element: <Accounts />,
};
