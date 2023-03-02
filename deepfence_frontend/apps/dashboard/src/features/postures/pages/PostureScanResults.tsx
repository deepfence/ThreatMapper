import cx from 'classnames';
import { capitalize, toNumber, truncate } from 'lodash-es';
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { RefObject } from 'react';
import { FaHistory } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import {
  HiArchive,
  HiArrowSmLeft,
  HiBell,
  HiChevronLeft,
  HiDotsVertical,
  HiDownload,
  HiExternalLink,
  HiEye,
  HiEyeOff,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  ActionFunctionArgs,
  Await,
  generatePath,
  LoaderFunctionArgs,
  Outlet,
  useFetcher,
  useLoaderData,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { Form } from 'react-router-dom';
import { toast } from 'sonner';
import { twMerge } from 'tailwind-merge';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  CircleSpinner,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  DropdownSubMenu,
  getRowSelectionColumn,
  IconButton,
  Modal,
  RowSelectionState,
  Select,
  SelectItem,
  Table,
  TableSkeleton,
} from 'ui-components';
import { ModalHeader, SlidingModal } from 'ui-components';

import {
  getCloudComplianceApiClient,
  getComplianceApiClient,
  getScanResultsApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelComplianceScanResult,
  ModelScanResultsActionRequestScanTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { PostureIcon } from '@/components/sideNavigation/icons/Posture';
import { POSTURE_SEVERITY_COLORS } from '@/constants/charts';
import { ApiVulnerableLoaderDataType } from '@/features/vulnerabilities/api/apiLoader';
import { MostExploitableChart } from '@/features/vulnerabilities/components/landing/MostExploitableChart';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { VulnerabilitySeverityType } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
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
}
type TableType = {
  status: string;
  service: string;
  nodeName: string;
  description: string;
  action?: null;
};
type ScanResult = {
  status: string;
  service: string;
  nodeName: string;
  description: string;
  tableData: TableType[];
  pagination: {
    currentPage: number;
    totalRows: number;
  };
};

export type LoaderDataType = {
  error?: string;
  message?: string;
  data: ScanResult;
};

const PAGE_SIZE = 15;
const page = 1;
const emptyData = {
  status: '',
  service: '',
  nodeName: '',
  description: '',
  timestamp: 0,
  tableData: [],
  pagination: {
    currentPage: 0,
    totalRows: 0,
  },
};

async function getScans(
  accountId: string,
  scanType: string,
  scanId: string,
): Promise<ScanResult> {
  const filterParams = {
    fields_filter: {
      contains_filter: {
        filter_in: {},
      },
      match_filter: { filter_in: {} },
      order_filter: { order_field: '' },
    },
    scan_id: scanId,
    window: {
      offset: 0,
      size: 10,
    },
  };

  let result = null;
  let resultCounts = null;
  if (scanType === 'compliance') {
    // result = await makeRequest({
    //   apiFunction: getComplianceApiClient().resultComplianceScan,
    //   apiArgs: [
    //     {
    //       modelScanResultsReq: filterParams,
    //     },
    //   ],
    //   errorHandler: async (r) => {
    //     const error = new ApiError<LoaderDataType>({ data: emptyData });
    //     if (r.status === 400) {
    //       const modelResponse: ApiDocsBadRequestResponse = await r.json();
    //       return error.set({
    //         message: modelResponse.message,
    //         data: emptyData,
    //       });
    //     }
    //   },
    // });
    // resultCounts = await makeRequest({
    //   apiFunction: getComplianceApiClient().resultCountComplianceScan,
    //   apiArgs: [
    //     {
    //       modelScanResultsReq: {
    //         ...filterParams,
    //         window: {
    //           ...filterParams.window,
    //           size: 10 * filterParams.window.size,
    //         },
    //       },
    //     },
    //   ],
    //   errorHandler: async (r) => {
    //     const error = new ApiError<LoaderDataType>({ data: emptyData });
    //     if (r.status === 400) {
    //       const modelResponse: ApiDocsBadRequestResponse = await r.json();
    //       return error.set({
    //         message: modelResponse.message,
    //         data: emptyData,
    //       });
    //     }
    //   },
    // });
  } else if (scanType === 'cloudCompliance') {
    result = await makeRequest({
      apiFunction: getCloudComplianceApiClient().resultCloudComplianceScan,
      apiArgs: [
        {
          modelScanResultsReq: filterParams,
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<LoaderDataType>({ data: emptyData });
        if (r.status === 400) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message,
            data: emptyData,
          });
        }
      },
    });
    resultCounts = await makeRequest({
      apiFunction: getCloudComplianceApiClient().resultCountCloudComplianceScan,
      apiArgs: [
        {
          modelScanResultsReq: {
            ...filterParams,
            window: {
              ...filterParams.window,
              size: 10 * filterParams.window.size,
            },
          },
        },
      ],
      errorHandler: async (r) => {
        const error = new ApiError<LoaderDataType>({ data: emptyData });
        if (r.status === 400) {
          const modelResponse: ApiDocsBadRequestResponse = await r.json();
          return error.set({
            message: modelResponse.message,
            data: emptyData,
          });
        }
      },
    });
  }

  if (ApiError.isApiError(result)) {
    // throw result.value();
  }

  if (result === null) {
    // return emptyData;
    result = {};
    (result as unknown as ModelComplianceScanResult).status_counts = {
      alarm: 0,
      info: 0,
      ok: 0,
      skip: 0,
    };

    (result as unknown as ModelComplianceScanResult).compliance_percentage = 7;
    (result as unknown as ModelComplianceScanResult).compliances = [
      {
        status: 'COMPLETED',
        service: 'S3',
        nodeName: 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        description:
          'IAM policies are the means by which privileges are granted to users, groups',
      },
      {
        status: 'COMPLETED',
        service: 'S3',
        nodeName: 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        description:
          'IAM policies are the means by which privileges are granted to users, groups',
      },
      {
        status: 'COMPLETED',
        service: 'S3',
        nodeName: 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        description:
          'IAM policies are the means by which privileges are granted to users, groups',
      },
      {
        status: 'COMPLETED',
        service: 'S3',
        nodeName: 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        description:
          'IAM policies are the means by which privileges are granted to users, groups',
      },
      {
        status: 'COMPLETED',
        service: 'S3',
        nodeName: 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        description:
          'IAM policies are the means by which privileges are granted to users, groups',
      },
      {
        status: 'COMPLETED',
        service: 'S3',
        nodeName: 'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
        description:
          'IAM policies are the means by which privileges are granted to users, groups',
      },
    ];
  }
  const totalCompliance = Object.values(result.status_counts ?? {}).reduce(
    (acc, value) => {
      acc = acc + value;
      return acc;
    },
    0,
  );

  const compliances = result.compliances;

  if (ApiError.isApiError(resultCounts)) {
    throw resultCounts.value();
  }

  return {
    totalCompliance,
    complianceCounts: {
      alarm: 0,
      info: 0,
      ok: 0,
      skip: 0,
    },
    tableData: compliances,
    pagination: {
      currentPage: page,
      // totalRows: page * PAGE_SIZE + resultCounts.count,
      totalRows: 15,
    },
  };
}

const loader = async ({
  params,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const scanType = params?.scanType ?? '';
  const accountId = params?.accountId ?? '';
  const scanId = params?.scanId ?? '';

  if (!scanType || !accountId || !scanId) {
    // throw new Error('Invalid params');
  }

  return typedDefer({
    data: getScans(accountId, scanType, scanId),
  });
};

const FilterHeader = () => {
  return (
    <ModalHeader>
      <div className="flex gap-x-2 items-center p-4">
        <span className="font-medium text-lg">Filters</span>
      </div>
    </ModalHeader>
  );
};

const ScanResultFilterModal = ({
  showFilter,
  elementToFocusOnClose,
  setShowFilter,
}: {
  elementToFocusOnClose: RefObject<FocusableElement> | null;
  showFilter: boolean;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <SlidingModal
      header={<FilterHeader />}
      open={showFilter}
      onOpenChange={() => setShowFilter(false)}
      elementToFocusOnCloseRef={elementToFocusOnClose}
      width={'w-[350px]'}
    >
      <div className="dark:text-white p-4">
        <div className="flex flex-col gap-y-6">
          <fieldset>
            <Select
              noPortal
              name="status"
              label={'Control Type'}
              placeholder="Select Control Type"
              value={searchParams.getAll('controls')}
              sizing="xs"
              onChange={(value) => {
                setSearchParams((prev) => {
                  prev.delete('controls');
                  value.forEach((language) => {
                    prev.append('controls', language);
                  });
                  return prev;
                });
              }}
            >
              {['hippa', 'gdpr', 'hippa', 'nist'].map((status: string) => {
                return (
                  <SelectItem value={status} key={status}>
                    {capitalize(status)}
                  </SelectItem>
                );
              })}
            </Select>
          </fieldset>
          <fieldset>
            <Select
              noPortal
              name="inventory"
              label={'Inventory Type'}
              placeholder="Select Inventory Type"
              value={searchParams.getAll('inventory')}
              sizing="xs"
              onChange={(value) => {
                setSearchParams((prev) => {
                  prev.delete('inventory');
                  value.forEach((language) => {
                    prev.append('inventory', language);
                  });
                  return prev;
                });
              }}
            >
              {['inventory 1', 'inventory 2', 'inventory 3', 'inventory 4'].map(
                (status: string) => {
                  return (
                    <SelectItem value={status} key={status}>
                      {capitalize(status)}
                    </SelectItem>
                  );
                },
              )}
            </Select>
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
              {['alarm', 'info', 'ok', 'skip'].map((status: string) => {
                return (
                  <SelectItem value={status} key={status}>
                    {capitalize(status)}
                  </SelectItem>
                );
              })}
            </Select>
          </fieldset>
        </div>
      </div>
    </SlidingModal>
  );
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
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      ids.forEach((item) => formData.append('cveIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

  return (
    <Modal open={showDialog} onOpenChange={() => setShowDialog(false)}>
      <div className="grid place-items-center">
        <IconContext.Provider
          value={{
            className: 'mb-3 dark:text-red-600 text-red-400 w-[70px] h-[70px]',
          }}
        >
          <HiOutlineExclamationCircle />
        </IconContext.Provider>
        <h3 className="mb-4 font-normal text-center text-sm">
          The selected vulnerabilities will be deleted.
          <br />
          <span>Are you sure you want to delete?</span>
        </h3>
        <div className="flex items-center justify-right gap-4">
          <Button size="xs" onClick={() => setShowDialog(false)}>
            No, cancel
          </Button>
          <Button
            size="xs"
            color="danger"
            onClick={() => {
              onDeleteAction(ActionEnumType.DELETE);
              setShowDialog(false);
            }}
          >
            Yes, I&apos;m sure
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const HistoryDropdown = () => {
  const { navigate } = usePageNavigation();
  const fetcher = useFetcher<ApiVulnerableLoaderDataType>();
  const loaderData = useLoaderData() as LoaderDataType;
  const params = useParams();
  const isScanHistoryLoading = fetcher.state === 'loading';

  const onHistoryClick = (nodeType: string, nodeId: string) => {
    fetcher.load(
      generatePath('/_api/vulnerability/scan-results/history/:nodeType/:nodeId', {
        nodeId: nodeId,
        nodeType: nodeType,
      }),
    );
  };

  return (
    <Suspense
      fallback={
        <IconButton
          size="xs"
          color="primary"
          outline
          className="rounded-lg bg-transparent"
          icon={<FaHistory />}
          type="button"
          loading
        />
      }
    >
      <Await resolve={loaderData.data ?? []}>
        {(resolvedData: LoaderDataType['data']) => {
          return (
            <Dropdown
              triggerAsChild
              onOpenChange={(open) => {
                if (open) onHistoryClick(resolvedData.nodeType, resolvedData.nodeId);
              }}
              content={
                <>
                  {fetcher?.data?.data?.map((item) => {
                    return (
                      <DropdownItem
                        className="text-sm"
                        key={item.scanId}
                        onClick={() => {
                          navigate(
                            generatePath('/vulnerability/scan-results/:scanId', {
                              scanId: item.scanId,
                            }),
                            {
                              replace: true,
                            },
                          );
                        }}
                      >
                        <span
                          className={twMerge(
                            cx('flex items-center text-gray-700 dark:text-gray-400', {
                              'text-blue-600 dark:text-blue-500':
                                item.scanId === params.scanId,
                            }),
                          )}
                        >
                          {formatMilliseconds(item.updatedAt)}
                        </span>
                      </DropdownItem>
                    );
                  })}
                </>
              }
            >
              <IconButton
                size="xs"
                color="primary"
                outline
                className="rounded-lg bg-transparent"
                icon={<FaHistory />}
                type="button"
                loading={isScanHistoryLoading}
              />
            </Dropdown>
          );
        }}
      </Await>
    </Suspense>
  );
};

const ActionDropdown = ({
  icon,
  ids,
  label,
}: {
  icon: React.ReactNode;
  ids: string[];
  label?: string;
}) => {
  const fetcher = useFetcher();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const onTableAction = useCallback(
    (actionType: string, maskHostAndImages?: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);

      ids.forEach((item) => formData.append('cveIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids],
  );

  return (
    <>
      <DeleteConfirmationModal
        showDialog={showDeleteDialog}
        ids={ids}
        setShowDialog={setShowDeleteDialog}
      />
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownSubMenu
              triggerAsChild
              content={
                <>
                  <DropdownItem onClick={() => onTableAction(ActionEnumType.MASK, '')}>
                    <IconContext.Provider
                      value={{ className: 'text-gray-700 dark:text-gray-400' }}
                    >
                      <HiEyeOff />
                    </IconContext.Provider>
                    Mask vulnerability
                  </DropdownItem>
                  <DropdownItem
                    onClick={() =>
                      onTableAction(ActionEnumType.MASK, 'maskHostAndImages')
                    }
                  >
                    <IconContext.Provider
                      value={{ className: 'text-gray-700 dark:text-gray-400' }}
                    >
                      <HiEyeOff />
                    </IconContext.Provider>
                    Mask vulnerability across hosts and images
                  </DropdownItem>
                </>
              }
            >
              <DropdownItem>
                <IconContext.Provider
                  value={{
                    className: 'w-4 h-4',
                  }}
                >
                  <HiChevronLeft />
                </IconContext.Provider>
                <span className="text-gray-700 dark:text-gray-400">Mask</span>
              </DropdownItem>
            </DropdownSubMenu>
            <DropdownSubMenu
              triggerAsChild
              content={
                <>
                  <DropdownItem onClick={() => onTableAction(ActionEnumType.UNMASK, '')}>
                    <IconContext.Provider
                      value={{ className: 'text-gray-700 dark:text-gray-400' }}
                    >
                      <HiEye />
                    </IconContext.Provider>
                    Un mask vulnerability
                  </DropdownItem>
                  <DropdownItem
                    onClick={() =>
                      onTableAction(ActionEnumType.UNMASK, 'maskHostAndImages')
                    }
                  >
                    <IconContext.Provider
                      value={{ className: 'text-gray-700 dark:text-gray-400' }}
                    >
                      <HiEye />
                    </IconContext.Provider>
                    Un mask vulnerability across hosts and images
                  </DropdownItem>
                </>
              }
            >
              <DropdownItem>
                <IconContext.Provider
                  value={{
                    className: 'w-4 h-4',
                  }}
                >
                  <HiChevronLeft />
                </IconContext.Provider>
                <span className="text-gray-700 dark:text-gray-400">Un mask</span>
              </DropdownItem>
            </DropdownSubMenu>
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
        <Button size="xs" color="normal" className="hover:bg-transparent">
          <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
            {icon}
          </IconContext.Provider>
          {label ? <span className="ml-2">{label}</span> : null}
        </Button>
      </Dropdown>
    </>
  );
};
const CVETable = () => {
  const fetcher = useFetcher();
  const loaderData = useLoaderData() as LoaderDataType;
  const columnHelper = createColumnHelper<TableType>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const columns = useMemo(() => {
    const columns = [
      getRowSelectionColumn(columnHelper, {
        size: 50,
        minSize: 30,
        maxSize: 50,
      }),
      columnHelper.accessor('status', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          console.log(info.getValue().toLowerCase() === 'completed');
          return (
            <Badge
              label={info.getValue().toUpperCase()}
              className={cx({
                'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                  info.getValue().toLowerCase() === 'completed',
                'bg-[#F05252]/20 dark:bg-[#F05252/20 text-[#F05252] dark:text-[#F05252]':
                  info.getValue().toLowerCase() === 'error',
                'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300':
                  info.getValue().toLowerCase() !== 'completed' &&
                  info.getValue().toLowerCase() !== 'error',
              })}
              size="sm"
            />
          );
        },
        header: () => 'Status',
        minSize: 80,
        size: 110,
        maxSize: 110,
      }),
      columnHelper.accessor('service', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => info.getValue(),
        header: () => 'Service',
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),

      columnHelper.accessor('nodeName', {
        enableSorting: false,
        enableResizing: false,
        cell: (info) => {
          return info.getValue() ?? 'No Description Available';
        },
        header: () => 'Resource',
        minSize: 80,
        size: 150,
        maxSize: 160,
      }),
      columnHelper.accessor('description', {
        enableResizing: false,
        enableSorting: false,
        minSize: 100,
        size: 200,
        maxSize: 210,
        header: () => 'Description',
        cell: (cell) => cell.getValue(),
      }),
      columnHelper.accessor('action', {
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown icon={<HiDotsVertical />} ids={[cell.row.original.cveId]} />
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
    <>
      <Suspense fallback={<TableSkeleton columns={6} rows={10} size={'md'} />}>
        <Await resolve={loaderData.data}>
          {(resolvedData: LoaderDataType['data']) => {
            return (
              <Form>
                {Object.keys(rowSelectionState).length === 0 ? (
                  <div className="text-sm text-gray-400 font-medium mb-3">
                    No rows selected
                  </div>
                ) : (
                  <>
                    <DeleteConfirmationModal
                      showDialog={showDeleteDialog}
                      ids={Object.keys(rowSelectionState)}
                      setShowDialog={setShowDeleteDialog}
                    />
                    <div className="mb-1.5 flex gap-x-2">
                      <Button
                        size="xxs"
                        color="danger"
                        outline
                        startIcon={<HiArchive />}
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        Delete
                      </Button>
                      <MaskDropdown ids={Object.keys(rowSelectionState)} />
                      <UnMaskDropdown ids={Object.keys(rowSelectionState)} />
                    </div>
                  </>
                )}

                <Table
                  size="sm"
                  data={resolvedData.tableData}
                  columns={columns}
                  enableRowSelection
                  rowSelectionState={rowSelectionState}
                  onRowSelectionChange={setRowSelectionState}
                  enableSorting
                  enablePagination
                  manualPagination
                  enableColumnResizing
                  totalRows={resolvedData.pagination.totalRows}
                  pageSize={PAGE_SIZE}
                  pageIndex={resolvedData.pagination.currentPage}
                  getRowId={(row) => row.cveId}
                  onPaginationChange={(updaterOrValue) => {
                    let newPageIndex = 0;
                    if (typeof updaterOrValue === 'function') {
                      newPageIndex = updaterOrValue({
                        pageIndex: resolvedData.pagination.currentPage,
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
                  getTrProps={(row) => {
                    if (row.original.masked) {
                      return {
                        className: 'opacity-40',
                      };
                    }
                    return {};
                  }}
                />
              </Form>
            );
          }}
        </Await>
      </Suspense>
    </>
  );
};

const HeaderComponent = ({
  setShowFilter,
}: {
  elementToFocusOnClose: React.MutableRefObject<null>;
  setShowFilter: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [searchParams] = useSearchParams();
  const loaderData = useLoaderData() as LoaderDataType;
  const isFilterApplied =
    searchParams.has('severity') ||
    searchParams.has('mask') ||
    searchParams.has('unmask');

  return (
    <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
      <Suspense fallback={<CircleSpinner size="xs" />}>
        <Await resolve={loaderData.data ?? []}>
          {(resolvedData: LoaderDataType['data']) => {
            const { nodeType, hostName } = resolvedData;
            return (
              <>
                <DFLink
                  to={`/vulnerability/scans?nodeType=${nodeType}`}
                  className="flex hover:no-underline items-center justify-center  mr-2"
                >
                  <IconContext.Provider
                    value={{
                      className: 'w-5 h-5 text-blue-600 dark:text-blue-500 ',
                    }}
                  >
                    <HiArrowSmLeft />
                  </IconContext.Provider>
                </DFLink>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  POSTURE SCAN RESULT - Account-12345 HIPPA
                </span>
              </>
            );
          }}
        </Await>
      </Suspense>
      <div className="ml-auto flex items-center gap-x-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-200">
            <Suspense fallback={<CircleSpinner size="xs" />}>
              <Await resolve={loaderData.data ?? []}>
                {(resolvedData: LoaderDataType['data']) => {
                  const { timestamp } = resolvedData;
                  return formatMilliseconds(timestamp);
                }}
              </Await>
            </Suspense>
          </span>
          <span className="text-gray-400 text-[10px]">Last scan</span>
        </div>

        <HistoryDropdown />

        <div className="relative">
          {isFilterApplied && (
            <span className="absolute left-0 top-0 inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
          )}
          <div>
            <IconButton
              size="xs"
              outline
              color="primary"
              className="rounded-lg bg-transparent"
              onClick={() => setShowFilter(true)}
              icon={<FiFilter />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
const MaskDropdown = ({ ids }: { ids: string[] }) => {
  const fetcher = useFetcher();

  const onMaskAction = useCallback(
    (maskHostAndImages: string) => {
      const formData = new FormData();
      formData.append('actionType', ActionEnumType.MASK);
      formData.append('maskHostAndImages', maskHostAndImages);
      ids.forEach((item) => formData.append('cveIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids, fetcher],
  );

  return (
    <Dropdown
      triggerAsChild={true}
      content={
        <>
          <DropdownItem className="text-sm" onClick={() => onMaskAction('')}>
            <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
              <IconContext.Provider
                value={{ className: 'text-gray-700 dark:text-gray-400' }}
              >
                <HiEyeOff />
              </IconContext.Provider>
              Mask {ids.length > 1 ? 'vulnerabilities' : 'vulnerability'}
            </span>
          </DropdownItem>
          <DropdownItem
            className="text-sm"
            onClick={() => onMaskAction('maskHostAndImages')}
          >
            <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
              <IconContext.Provider
                value={{ className: 'text-gray-700 dark:text-gray-400' }}
              >
                <HiEyeOff />
              </IconContext.Provider>
              Mask {ids.length > 1 ? 'vulnerabilities' : 'vulnerability'} across hosts and
              images
            </span>
          </DropdownItem>
        </>
      }
    >
      <Button size="xs" color="default" outline startIcon={<HiEyeOff />} type="button">
        Mask
      </Button>
    </Dropdown>
  );
};
const UnMaskDropdown = ({ ids }: { ids: string[] }) => {
  const fetcher = useFetcher();

  const onUnMaskAction = useCallback(
    (unMaskHostAndImages: string) => {
      const formData = new FormData();
      formData.append('actionType', ActionEnumType.UNMASK);
      formData.append('maskHostAndImages', unMaskHostAndImages);
      ids.forEach((item) => formData.append('cveIds[]', item));
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [ids],
  );

  return (
    <Dropdown
      triggerAsChild={true}
      content={
        <>
          <DropdownItem className="text-sm" onClick={() => onUnMaskAction('')}>
            <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
              <IconContext.Provider
                value={{ className: 'text-gray-700 dark:text-gray-400' }}
              >
                <HiEye />
              </IconContext.Provider>
              Unmask {ids.length > 1 ? 'vulnerabilities' : 'vulnerability'}
            </span>
          </DropdownItem>
          <DropdownItem
            className="text-sm"
            onClick={() => onUnMaskAction('maskHostAndImages')}
          >
            <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
              <IconContext.Provider
                value={{ className: 'text-gray-700 dark:text-gray-400' }}
              >
                <HiEye />
              </IconContext.Provider>
              Unmask {ids.length > 1 ? 'vulnerabilities' : 'vulnerability'} across hosts
              and images
            </span>
          </DropdownItem>
        </>
      }
    >
      <Button size="xs" color="default" outline startIcon={<HiEye />} type="button">
        Un mask
      </Button>
    </Dropdown>
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
        <Await resolve={loaderData.data}>
          {(resolvedData: ScanResult) => {
            const { totalCompliance, complianceCounts } = resolvedData;
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
                        {totalCompliance}
                      </span>
                      <h5 className="text-xs text-gray-500 dark:text-gray-200 mb-2">
                        Total count
                      </h5>
                      <div>
                        <span className="text-sm text-gray-900 dark:text-gray-200">
                          {0}
                        </span>
                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                          Active containers
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-[200px]">
                  <MostExploitableChart theme={theme} data={complianceCounts} />
                </div>
                <div>
                  {Object.keys(complianceCounts)?.map((key: string) => {
                    return (
                      <div key={key} className="flex items-center gap-2 p-1">
                        <div
                          className={cx('h-3 w-3 rounded-full')}
                          style={{
                            backgroundColor:
                              POSTURE_SEVERITY_COLORS[
                                key.toLowerCase() as VulnerabilitySeverityType
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
                          {complianceCounts[key]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          }}
        </Await>
      </Suspense>
    </Card>
  );
};
const PostureScanResults = () => {
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);
  const { mode } = useTheme();

  return (
    <>
      <ScanResultFilterModal
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        elementToFocusOnClose={elementToFocusOnClose.current}
      />
      <HeaderComponent
        elementToFocusOnClose={elementToFocusOnClose}
        setShowFilter={setShowFilter}
      />
      <div className="grid grid-cols-[400px_1fr] p-2 gap-x-2">
        <div className="self-start grid gap-y-2">
          <StatusCountComponent theme={mode} />
        </div>
        <CVETable />
      </div>
      <Outlet />
    </>
  );
};

export const module = {
  loader,
  element: <PostureScanResults />,
};
