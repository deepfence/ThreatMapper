import cx from 'classnames';
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { IconContext } from 'react-icons';
import { FiFilter } from 'react-icons/fi';
import {
  HiArchive,
  HiChevronRight,
  HiClock,
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
  useNavigation,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
  Breadcrumb,
  BreadcrumbLink,
  Button,
  CircleSpinner,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  IconButton,
  Modal,
  Popover,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';
import { Checkbox } from 'ui-components';

import { getScanResultsApiClient, getSearchApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelScanInfo,
  SearchSearchScanReq,
  UtilsReportFiltersNodeTypeEnum,
  UtilsReportFiltersScanTypeEnum,
} from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { FilterHeader } from '@/components/forms/FilterHeader';
import { SearchableClusterList } from '@/components/forms/SearchableClusterList';
import { SearchableContainerList } from '@/components/forms/SearchableContainerList';
import { SearchableHostList } from '@/components/forms/SearchableHostList';
import { SearchableImageList } from '@/components/forms/SearchableImageList';
import { SecretsIcon } from '@/components/sideNavigation/icons/Secrets';
import { SEVERITY_COLORS } from '@/constants/charts';
import { useDownloadScan } from '@/features/common/data-component/downloadScanAction';
import { IconMapForNodeType } from '@/features/onboard/components/IconMapForNodeType';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { formatMilliseconds } from '@/utils/date';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { isScanComplete } from '@/utils/scan';
import { DFAwait } from '@/utils/suspense';
import {
  getOrderFromSearchParams,
  getPageFromSearchParams,
  useSortingState,
} from '@/utils/table';

export interface FocusableElement {
  focus(options?: FocusOptions): void;
}

enum ActionEnumType {
  DELETE = 'delete',
}

const PAGE_SIZE = 15;

enum NodeTypeEnum {
  Host = 'host',
  Container = 'container',
  Image = 'image',
}

type ScanResult = ModelScanInfo & {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown: number;
};

export type LoaderDataType = {
  error?: string;
  message?: string;
  data: Awaited<ReturnType<typeof getScans>>;
};

const getStatusSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('status').map((status) => status.toUpperCase());
};
const getHostsSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('hosts');
};
const getContainersSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('containers');
};
const getContainerImagesSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('containerImages');
};
const getLanguagesSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('languages');
};
const getClustersSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('clusters');
};

async function getScans(
  nodeTypes: NodeTypeEnum[],
  searchParams: URLSearchParams,
): Promise<{
  scans: ScanResult[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const results: {
    scans: ScanResult[];
    currentPage: number;
    totalRows: number;
    message?: string;
  } = {
    scans: [],
    currentPage: 1,
    totalRows: 0,
  };
  const status = getStatusSearch(searchParams);
  const scanFilters = {} as {
    status?: string[];
  };
  if (status.length > 0) {
    scanFilters.status = status;
  }

  const nodeFilters = {
    node_type: nodeTypes,
  } as {
    status?: string[];
    node_type?: string[];
    node_id?: string[];
    kubernetes_cluster_id?: string[];
  };
  const hosts = getHostsSearch(searchParams);
  const containers = getContainersSearch(searchParams);
  const images = getContainerImagesSearch(searchParams);
  const languages = getLanguagesSearch(searchParams);
  const clusters = getClustersSearch(searchParams);

  const page = getPageFromSearchParams(searchParams);
  const order = getOrderFromSearchParams(searchParams);

  if (hosts && hosts?.length > 0) {
    nodeFilters.node_id = nodeFilters.node_id ? nodeFilters.node_id.concat(hosts) : hosts;
  }
  if (containers && containers?.length > 0) {
    nodeFilters.node_id = nodeFilters.node_id
      ? nodeFilters.node_id.concat(containers)
      : containers;
  }
  if (images && images?.length > 0) {
    nodeFilters.node_id = nodeFilters.node_id
      ? nodeFilters.node_id.concat(images)
      : images;
  }

  if (clusters && clusters?.length > 0) {
    nodeFilters.kubernetes_cluster_id = clusters;
  }

  const languageFilters = {} as {
    trigger_action: string[];
  };
  if (languages && languages.length > 0) {
    languageFilters.trigger_action = languages;
  }

  const scanRequestParams: SearchSearchScanReq = {
    node_filters: {
      filters: {
        contains_filter: { filter_in: { ...nodeFilters } },
        order_filter: { order_fields: [] },
        match_filter: { filter_in: {} },
        compare_filter: null,
      },
      in_field_filter: null,
      window: {
        offset: 0,
        size: 0,
      },
    },
    scan_filters: {
      filters: {
        contains_filter: { filter_in: { ...languageFilters, ...scanFilters } },
        order_filter: { order_fields: [] },
        match_filter: { filter_in: {} },
        compare_filter: null,
      },
      in_field_filter: null,
      window: {
        offset: 0,
        size: 1,
      },
    },
    window: { offset: page * PAGE_SIZE, size: PAGE_SIZE },
  };

  if (order) {
    scanRequestParams.scan_filters.filters.order_filter.order_fields = [
      {
        field_name: order.sortBy,
        descending: order.descending,
      },
    ];
  } else {
    scanRequestParams.scan_filters.filters.order_filter.order_fields = [
      {
        field_name: 'updated_at',
        descending: true,
      },
    ];
  }
  const searchSecretsScanApi = apiWrapper({
    fn: getSearchApiClient().searchSecretsScan,
  });
  const result = await searchSecretsScanApi({
    searchSearchScanReq: scanRequestParams,
  });
  if (!result.ok) {
    throw result.error;
  }

  const countsResultApi = apiWrapper({
    fn: getSearchApiClient().searchSecretScanCount,
  });
  const countsResult = await countsResultApi({
    searchSearchScanReq: {
      ...scanRequestParams,
      window: {
        ...scanRequestParams.window,
        size: 10 * scanRequestParams.window.size,
      },
    },
  });
  if (!countsResult.ok) {
    throw countsResult.error;
  }

  if (result.value === null) {
    return results;
  }

  results.scans = result.value.map((scan) => {
    const severities = scan.severity_counts as {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    };
    severities.critical = severities.critical ?? 0;
    severities.high = severities.high ?? 0;
    severities.medium = severities.medium ?? 0;
    severities.low = severities.low ?? 0;
    severities.unknown = severities.unknown ?? 0;

    return {
      ...scan,
      total: severities.critical + severities.high + severities.medium + severities.low,
      critical: severities.critical,
      high: severities.high,
      medium: severities.medium,
      low: severities.low,
      unknown: severities.unknown,
    };
  });

  results.currentPage = page;
  results.totalRows = page * PAGE_SIZE + countsResult.value.count;

  return results;
}

const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const searchParams = new URL(request.url).searchParams;

  const nodeType = searchParams.getAll('nodeType').length
    ? searchParams.getAll('nodeType')
    : ['container_image', 'container', 'host'];

  return typedDefer({
    data: getScans(nodeType as NodeTypeEnum[], searchParams),
  });
};

const action = async ({
  request,
}: ActionFunctionArgs): Promise<
  | {
      url: string;
    }
  | null
  | { success: boolean; message?: string }
> => {
  const formData = await request.formData();
  const actionType = formData.get('actionType');
  const scanId = formData.get('scanId');
  const nodeId = formData.get('nodeId');
  if (!actionType || !scanId || !nodeId) {
    throw new Error('Invalid action');
  }

  if (actionType === ActionEnumType.DELETE) {
    const resultApi = apiWrapper({
      fn: getScanResultsApiClient().deleteScanResultsForScanID,
    });
    const result = await resultApi({
      scanId: scanId.toString(),
      scanType: ScanTypeEnum.SecretScan,
    });
    if (!result.ok) {
      if (result.error.response.status === 400 || result.error.response.status === 409) {
        return {
          success: false,
          message: result.error.message ?? '',
        };
      } else if (result.error.response.status === 403) {
        return {
          success: false,
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

const DeleteConfirmationModal = ({
  showDialog,
  scanId,
  nodeId,
  setShowDialog,
}: {
  showDialog: boolean;
  scanId: string;
  nodeId: string;
  setShowDialog: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher();

  const onDeleteAction = useCallback(
    (actionType: string) => {
      const formData = new FormData();
      formData.append('actionType', actionType);
      formData.append('scanId', scanId);
      formData.append('nodeId', nodeId);
      fetcher.submit(formData, {
        method: 'post',
      });
    },
    [scanId, nodeId, fetcher],
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
  nodeId,
  scanStatus,
  nodeType,
  setShowDeleteDialog,
  setScanIdToDelete,
  setNodeIdToDelete,
}: {
  icon: React.ReactNode;
  scanId: string;
  nodeId: string;
  scanStatus: string;
  nodeType: string;
  setShowDeleteDialog: React.Dispatch<React.SetStateAction<boolean>>;
  setScanIdToDelete: React.Dispatch<React.SetStateAction<string>>;
  setNodeIdToDelete: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);
  const { downloadScan } = useDownloadScan();

  const onDownloadAction = useCallback(() => {
    downloadScan({
      scanId,
      nodeType: nodeType as UtilsReportFiltersNodeTypeEnum,
      scanType: UtilsReportFiltersScanTypeEnum.Secret,
    });
  }, [scanId, nodeId, fetcher]);

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
            onClick={(e) => {
              if (!isScanComplete(scanStatus)) return;
              e.preventDefault();
              onDownloadAction();
            }}
          >
            <span
              className={cx('flex items-center gap-x-2', {
                'opacity-60 dark:opacity-30 cursor-default': !isScanComplete(scanStatus),
              })}
            >
              <HiDownload />
              Download Report
            </span>
          </DropdownItem>
          <DropdownItem
            className="text-sm"
            onClick={() => {
              setScanIdToDelete(scanId);
              setNodeIdToDelete(nodeId);
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
      <Button className="ml-auto" size="xs" color="normal">
        <IconContext.Provider value={{ className: 'text-gray-700 dark:text-gray-400' }}>
          {icon}
        </IconContext.Provider>
      </Button>
    </Dropdown>
  );
};

const SecretScans = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const elementToFocusOnClose = useRef(null);
  const loaderData = useLoaderData() as LoaderDataType;
  const navigation = useNavigation();
  const [sort, setSort] = useSortingState();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scanIdToDelete, setScanIdToDelete] = useState('');
  const [nodeIdToDelete, setNodeIdToDelete] = useState('');

  const columnHelper = createColumnHelper<ScanResult>();

  const columns = useMemo(() => {
    const columns = [
      columnHelper.accessor('node_type', {
        cell: (info) => {
          return (
            <div className="flex items-center gap-x-2">
              <div className="bg-blue-100 dark:bg-blue-500/10 p-1.5 rounded-lg">
                <IconContext.Provider
                  value={{ className: 'w-4 h-4 text-blue-500 dark:text-blue-400' }}
                >
                  {IconMapForNodeType[info.getValue()]}
                </IconContext.Provider>
              </div>
              <span className="flex-1 truncate capitalize">
                {info.getValue()?.replaceAll('_', ' ')}
              </span>
            </div>
          );
        },
        header: () => 'Type',
        minSize: 100,
        size: 120,
        maxSize: 130,
      }),
      columnHelper.accessor('node_name', {
        enableSorting: false,
        cell: (info) => {
          const isNeverScan = info.row.original.status?.toLowerCase() === '';
          const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
            return isNeverScan ? (
              <>{children}</>
            ) : (
              <DFLink
                to={generatePath(`/secret/scan-results/:scanId`, {
                  scanId: info.row.original.scan_id,
                })}
              >
                {children}
              </DFLink>
            );
          };
          return (
            <WrapperComponent>
              <div className="flex items-center gap-x-2 truncate">
                <span className="truncate">{info.getValue()}</span>
              </div>
            </WrapperComponent>
          );
        },
        header: () => 'Name',
        minSize: 300,
        size: 300,
        maxSize: 500,
      }),
      columnHelper.accessor('updated_at', {
        cell: (info) => (
          <div className="flex items-center gap-x-2">
            <IconContext.Provider value={{ className: 'text-gray-400' }}>
              <HiClock />
            </IconContext.Provider>
            <span className="truncate">{formatMilliseconds(info.getValue())}</span>
          </div>
        ),
        header: () => 'Timestamp',
        minSize: 140,
        size: 170,
        maxSize: 200,
      }),
      columnHelper.accessor('status', {
        enableSorting: true,
        cell: (info) => (
          <Badge
            label={info.getValue().toUpperCase().replaceAll('_', ' ')}
            className={cx({
              'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
                info.getValue().toLowerCase() === 'complete',
              'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
                info.getValue().toLowerCase() === 'error',
              'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
                info.getValue().toLowerCase() === 'in_progress',
            })}
            size="sm"
          />
        ),
        header: () => 'Status',
        minSize: 100,
        size: 110,
        maxSize: 110,
        enableResizing: false,
      }),
      columnHelper.accessor('total', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{info.getValue()}</span>
            <div className="w-5 h-5 text-gray-400 shrink-0">
              <SecretsIcon />
            </div>
          </div>
        ),
        header: () => <div className="text-right truncate">Total</div>,
        minSize: 80,
        size: 80,
        maxSize: 80,
      }),
      columnHelper.accessor('critical', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{info.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: SEVERITY_COLORS['critical'],
              }}
            ></div>
          </div>
        ),
        header: () => '',
        minSize: 65,
        size: 65,
        maxSize: 65,
        enableResizing: false,
      }),
      columnHelper.accessor('high', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{info.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: SEVERITY_COLORS['high'],
              }}
            ></div>
          </div>
        ),
        header: () => '',
        minSize: 65,
        size: 65,
        maxSize: 65,
        enableResizing: false,
      }),
      columnHelper.accessor('medium', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{info.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: SEVERITY_COLORS['medium'],
              }}
            ></div>
          </div>
        ),
        header: () => '',
        minSize: 65,
        size: 65,
        maxSize: 65,
        enableResizing: false,
      }),
      columnHelper.accessor('low', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{info.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: SEVERITY_COLORS['low'],
              }}
            ></div>
          </div>
        ),
        header: () => '',
        minSize: 65,
        size: 65,
        maxSize: 65,
        enableResizing: false,
      }),
      columnHelper.accessor('unknown', {
        enableSorting: false,
        cell: (info) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{info.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: SEVERITY_COLORS['unknown'],
              }}
            ></div>
          </div>
        ),
        header: () => '',
        minSize: 65,
        size: 65,
        maxSize: 65,
        enableResizing: false,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown
            icon={<HiDotsVertical />}
            scanId={cell.row.original.scan_id}
            nodeId={cell.row.original.node_id}
            nodeType={cell.row.original.node_type}
            scanStatus={cell.row.original.status}
            setScanIdToDelete={setScanIdToDelete}
            setNodeIdToDelete={setNodeIdToDelete}
            setShowDeleteDialog={setShowDeleteDialog}
          />
        ),
        header: () => '',
        minSize: 50,
        size: 50,
        maxSize: 50,
        enableResizing: false,
      }),
    ];

    return columns;
  }, []);

  const isFilterApplied =
    searchParams.has('languages') ||
    searchParams.has('containerImages') ||
    searchParams.has('containers') ||
    searchParams.has('nodeType') ||
    searchParams.has('hosts') ||
    searchParams.has('clusters');

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
            <DFLink to={'/secret'}>Secrets</DFLink>
          </BreadcrumbLink>
          <BreadcrumbLink>
            <span className="inherit cursor-auto">Secret Scans</span>
          </BreadcrumbLink>
        </Breadcrumb>

        <span className="ml-2">
          {navigation.state === 'loading' ? <CircleSpinner size="xs" /> : null}
        </span>
        <div className="ml-auto flex gap-x-4">
          <div className="relative gap-x-4">
            {isFilterApplied && (
              <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            )}

            <Popover
              triggerAsChild
              elementToFocusOnCloseRef={elementToFocusOnClose}
              content={
                <div className="dark:text-white">
                  <FilterHeader onReset={onResetFilters} />
                  <Form className="flex flex-col gap-y-4 p-4">
                    <fieldset>
                      <legend className="text-sm font-medium">Type</legend>
                      <div className="flex gap-x-4 mt-1">
                        <Checkbox
                          label="Host"
                          checked={searchParams.getAll('nodeType').includes('host')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('nodeType', 'host');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('nodeType');
                                prev.delete('nodeType');
                                prevStatuses
                                  .filter((status) => status !== 'host')
                                  .forEach((status) => {
                                    prev.append('nodeType', status);
                                  });
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="Container"
                          checked={searchParams.getAll('nodeType').includes('container')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('nodeType', 'container');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('nodeType');
                                prev.delete('nodeType');
                                prevStatuses
                                  .filter((status) => status !== 'container')
                                  .forEach((status) => {
                                    prev.append('nodeType', status);
                                  });
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="Container Images"
                          checked={searchParams
                            .getAll('nodeType')
                            .includes('container_image')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('nodeType', 'container_image');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('nodeType');
                                prev.delete('page');
                                prev.delete('nodeType');
                                prevStatuses
                                  .filter((status) => status !== 'container_image')
                                  .forEach((status) => {
                                    prev.append('nodeType', status);
                                  });
                                return prev;
                              });
                            }
                          }}
                        />
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="text-sm font-medium">Status</legend>
                      <div className="flex gap-x-4 mt-1">
                        <Checkbox
                          label="Completed"
                          checked={searchParams.getAll('status').includes('complete')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('status', 'complete');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('status');
                                prev.delete('status');
                                prev.delete('page');
                                prevStatuses
                                  .filter((status) => status !== 'complete')
                                  .forEach((status) => {
                                    prev.append('status', status);
                                  });
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="In Progress"
                          checked={searchParams.getAll('status').includes('in_progress')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('status', 'in_progress');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('status');
                                prev.delete('status');
                                prevStatuses
                                  .filter((status) => status !== 'in_progress')
                                  .forEach((status) => {
                                    prev.append('status', status);
                                  });
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="Error"
                          checked={searchParams.getAll('status').includes('error')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('status', 'error');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('status');
                                prev.delete('status');
                                prev.delete('page');
                                prevStatuses
                                  .filter((status) => status !== 'error')
                                  .forEach((status) => {
                                    prev.append('status', status);
                                  });
                                return prev;
                              });
                            }
                          }}
                        />
                      </div>
                    </fieldset>
                    <fieldset>
                      <SearchableHostList
                        scanType={ScanTypeEnum.VulnerabilityScan}
                        defaultSelectedHosts={searchParams.getAll('hosts')}
                        reset={!isFilterApplied}
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('hosts');
                            value.forEach((host) => {
                              prev.append('hosts', host);
                            });
                            prev.delete('page');
                            return prev;
                          });
                        }}
                      />
                    </fieldset>
                    <fieldset>
                      <SearchableContainerList
                        scanType={ScanTypeEnum.VulnerabilityScan}
                        defaultSelectedContainers={searchParams.getAll('containers')}
                        reset={!isFilterApplied}
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('containers');
                            value.forEach((container) => {
                              prev.append('containers', container);
                            });
                            prev.delete('page');
                            return prev;
                          });
                        }}
                      />
                    </fieldset>
                    <fieldset>
                      <SearchableImageList
                        scanType={ScanTypeEnum.VulnerabilityScan}
                        defaultSelectedImages={searchParams.getAll('containerImages')}
                        reset={!isFilterApplied}
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('containerImages');
                            value.forEach((containerImage) => {
                              prev.append('containerImages', containerImage);
                            });
                            prev.delete('page');
                            return prev;
                          });
                        }}
                      />
                    </fieldset>
                    <fieldset>
                      <SearchableClusterList
                        defaultSelectedClusters={searchParams.getAll('clusters')}
                        reset={!isFilterApplied}
                        onChange={(value) => {
                          setSearchParams((prev) => {
                            prev.delete('clusters');
                            value.forEach((cluster) => {
                              prev.append('clusters', cluster);
                            });
                            prev.delete('page');
                            return prev;
                          });
                        }}
                      />
                    </fieldset>
                  </Form>
                </div>
              }
            >
              <IconButton
                className="ml-auto rounded-lg"
                size="xs"
                outline
                color="primary"
                ref={elementToFocusOnClose}
                icon={<FiFilter />}
              />
            </Popover>
          </div>
        </div>
      </div>
      {showDeleteDialog && (
        <DeleteConfirmationModal
          showDialog={showDeleteDialog}
          scanId={scanIdToDelete}
          nodeId={nodeIdToDelete}
          setShowDialog={setShowDeleteDialog}
        />
      )}
      <div className="m-2">
        <Suspense fallback={<TableSkeleton columns={7} rows={15} size={'md'} />}>
          <DFAwait resolve={loaderData.data}>
            {(resolvedData: LoaderDataType['data']) => {
              return (
                <Table
                  size="sm"
                  data={resolvedData.scans}
                  columns={columns}
                  enablePagination
                  manualPagination
                  enableColumnResizing
                  approximatePagination
                  totalRows={resolvedData.totalRows}
                  pageSize={PAGE_SIZE}
                  pageIndex={resolvedData.currentPage}
                  onPaginationChange={(updaterOrValue) => {
                    let newPageIndex = 0;
                    if (typeof updaterOrValue === 'function') {
                      newPageIndex = updaterOrValue({
                        pageIndex: resolvedData.currentPage,
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
                />
              );
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
  element: <SecretScans />,
};
