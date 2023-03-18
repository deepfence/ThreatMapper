import cx from 'classnames';
import { Suspense, useMemo, useRef, useState } from 'react';
import { FaPlay, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiArrowSmLeft, HiDotsVertical, HiOutlineEye, HiRefresh } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  Form,
  generatePath,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
  useRevalidator,
  useSearchParams,
} from 'react-router-dom';
import {
  Badge,
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

import { getCloudNodesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelCloudNodeAccountInfo } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { ACCOUNT_CONNECTOR } from '@/components/hosts-connector/NoConnectors';
import { PostureScanConfigureForm } from '@/components/scan-configure-forms/PostureScanConfigureForm';
import { ApiError, makeRequest } from '@/utils/api';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { DFAwait } from '@/utils/suspense';
import { getPageFromSearchParams } from '@/utils/table';
import { usePageNavigation } from '@/utils/usePageNavigation';

enum ActionEnumType {
  START_SCAN = 'start_scan',
  VIEW_SCAN = 'view_scan',
  VIEW_INVENTORY = 'view_inventory',
  REFRESH_DATA = 'refresh_data',
}

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

const getActiveStatus = (searchParams: URLSearchParams) => {
  return searchParams.getAll('active');
};

async function getAccounts(
  nodeType: string,
  searchParams: URLSearchParams,
): Promise<{
  accounts: ModelCloudNodeAccountInfo[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const active = getActiveStatus(searchParams);
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
  const result = await makeRequest({
    apiFunction: getCloudNodesApiClient().listCloudNodeAccount,
    apiArgs: [
      {
        modelCloudNodeAccountsListReq: {
          cloud_provider: nodeType,
          window: {
            offset: 0 * PAGE_SIZE,
            size: PAGE_SIZE,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<LoaderDataType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  return {
    accounts: result.cloud_node_accounts_info ?? [],
    currentPage: 1,
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

const ActionDropdown = ({
  icon,
  id,
  label,
  isScanComplete,
}: {
  icon: React.ReactNode;
  isScanComplete: boolean;
  id: string;
  label?: string;
}) => {
  const { navigate } = usePageNavigation();
  const onTableAction = (action: string) => {
    const id = 12345;
    switch (action) {
      case ActionEnumType.VIEW_SCAN:
        navigate(`/posture/scan-results/${id}/scanId`);
        break;
    }
  };
  return (
    <>
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem
              className="text-sm"
              onClick={() => {
                if (isScanComplete) {
                  onTableAction(ActionEnumType.VIEW_SCAN);
                }
              }}
            >
              <span
                className={cx(
                  'flex items-center gap-x-2 text-gray-700 dark:text-gray-400',
                  {
                    'opacity-50 cursor-not-allowed': !isScanComplete,
                  },
                )}
              >
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <HiOutlineEye />
                </IconContext.Provider>
                View scan
              </span>
            </DropdownItem>

            <DropdownItem className="text-sm">
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <HiRefresh />
                </IconContext.Provider>
                Refresh data
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

const PostureTable = () => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<ModelCloudNodeAccountInfo>();
  const [openScanConfigure, setOpenScanConfigure] = useState<{
    show: boolean;
    nodeIds: string[];
  }>({
    show: false,
    nodeIds: [],
  });
  const loaderData = useLoaderData() as LoaderDataType;

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
        header: () => null,
      }),
      columnHelper.accessor('node_name', {
        cell: (cell) => {
          const isScanComplete =
            cell.row.original.last_scan_status?.toLowerCase() === 'complete';
          const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
            if (isScanComplete) {
              return (
                <DFLink
                  to={generatePath(`/posture/scan-results/:scanId`, {
                    scanId: cell.row.original.last_scan_id ?? '',
                  })}
                >
                  {children}
                </DFLink>
              );
            }
            return <>{children}</>;
          };
          return (
            <WrapperComponent>
              <div className="flex items-center gap-x-2 truncate">
                <span className="truncate capitalize">{cell.getValue()}</span>
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
          return (
            <Badge
              label={value?.toUpperCase() || 'UNKNOWN'}
              className={cx('text-md rounded-lg font-medium text-center w-fit px-2', {
                'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                  value?.toLowerCase() === 'complete',
                'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                  value?.toLowerCase() === 'error',
              })}
              size="sm"
            />
          );
        },
        header: () => 'Status',
        minSize: 50,
        size: 70,
        maxSize: 80,
      }),
      columnHelper.display({
        id: 'startScan',
        enableSorting: false,
        cell: (info) => (
          <Button
            size="xs"
            color="normal"
            startIcon={<FaPlay />}
            className="text-blue-600 dark:text-blue-500"
            onClick={() => {
              if (!info.row.original.node_id) {
                throw new Error('Node id is required to start scan');
              }
              setOpenScanConfigure({
                show: true,
                nodeIds: [info.row.original.node_id],
              });
            }}
          >
            Start scan
          </Button>
        ),
        header: () => 'Start action',
        minSize: 80,
        size: 100,
        maxSize: 120,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const isScanComplete =
            cell.row.original.last_scan_status?.toLowerCase() === 'complete';
          return (
            <ActionDropdown
              icon={<HiDotsVertical />}
              id={cell.row.original.node_id ?? ''}
              isScanComplete={isScanComplete}
            />
          );
        },
        header: () => '',
        minSize: 40,
        size: 40,
        maxSize: 40,
        enableResizing: false,
      }),
    ],
    [rowSelectionState, searchParams, setSearchParams],
  );

  return (
    <>
      <Suspense fallback={<TableSkeleton columns={6} rows={10} size={'md'} />}>
        <DFAwait resolve={loaderData.data}>
          {(resolvedData: LoaderDataType['data']) => {
            const accounts = resolvedData?.accounts ?? [];
            const totalRows = resolvedData?.totalRows ?? 0;
            const currentPage = resolvedData?.currentPage ?? 0;
            return (
              <div>
                <Modal
                  open={openScanConfigure.show}
                  width="w-full"
                  title="Configure your scan option"
                  onOpenChange={() =>
                    setOpenScanConfigure({
                      show: false,
                      nodeIds: [],
                    })
                  }
                >
                  <div className="p-4 pt-0">
                    <PostureScanConfigureForm
                      wantAdvanceOptions={true}
                      onSuccess={() => {
                        setOpenScanConfigure({
                          show: false,
                          nodeIds: [],
                        });
                      }}
                      data={{
                        nodeType: 'aws',
                        nodeIds: Object.keys(openScanConfigure),
                        images: [],
                      }}
                    />
                  </div>
                </Modal>
                <Form>
                  {Object.keys(rowSelectionState).length === 0 ? (
                    <div className="text-sm text-gray-400 font-medium mb-3 flex justify-between">
                      No rows selected
                    </div>
                  ) : (
                    <>
                      <div className="mb-1.5 flex gap-x-2">
                        <Button
                          size="xs"
                          color="normal"
                          startIcon={<FaPlay />}
                          className="text-blue-600 dark:text-blue-500"
                          onClick={() =>
                            setOpenScanConfigure({
                              show: true,
                              nodeIds: Object.keys(rowSelectionState),
                            })
                          }
                        >
                          Start scan
                        </Button>
                      </div>
                    </>
                  )}
                </Form>
                <Table
                  size="sm"
                  data={accounts ?? []}
                  columns={columns}
                  enableRowSelection
                  enablePagination
                  manualPagination
                  totalRows={totalRows}
                  pageIndex={currentPage}
                  onPaginationChange={(updaterOrValue) => {
                    let newPageIndex = 0;
                    if (typeof updaterOrValue === 'function') {
                      newPageIndex = updaterOrValue({
                        pageIndex: currentPage,
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
                  pageSize={PAGE_SIZE}
                  rowSelectionState={rowSelectionState}
                  onRowSelectionChange={setRowSelectionState}
                  getRowId={(row) => row.node_id ?? ''}
                />
              </div>
            );
          }}
        </DFAwait>
      </Suspense>
    </>
  );
};

const RefreshApiButton = () => {
  const revalidator = useRevalidator();
  return (
    <IconButton
      className="ml-auto rounded-lg"
      size="xs"
      outline
      color="primary"
      onClick={() => revalidator.revalidate()}
      loading={revalidator.state === 'loading'}
      icon={<HiRefresh />}
    />
  );
};

const Accounts = () => {
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);
  const loaderData = useLoaderData() as LoaderDataType;
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams() as {
    nodeType: string;
  };
  const { navigate } = usePageNavigation();
  const isFilterApplied = searchParams.has('');

  return (
    <div>
      <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <DFLink
          to="/posture"
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
        <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
          Posture Accounts
        </span>
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
          <RefreshApiButton />
          <div>
            {isFilterApplied && (
              <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            )}

            <Popover
              triggerAsChild
              elementToFocusOnCloseRef={elementToFocusOnClose}
              content={
                <div className="dark:text-white p-4 w-[300px]">
                  <div className="flex flex-col gap-y-6">
                    <fieldset>
                      <legend className="text-sm font-medium">Active</legend>
                      <div className="flex gap-x-4 mt-1">
                        <Checkbox
                          label="No"
                          checked={searchParams.getAll('active').includes('true')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('active', 'true');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('active');
                                prev.delete('active');
                                prevStatuses
                                  .filter((active) => active !== 'true')
                                  .forEach((active) => {
                                    prev.append('active', active);
                                  });
                                prev.delete('active');
                                prev.delete('page');
                                return prev;
                              });
                            }
                          }}
                        />
                        <Checkbox
                          label="Yes"
                          checked={searchParams.getAll('active').includes('false')}
                          onCheckedChange={(state) => {
                            if (state) {
                              setSearchParams((prev) => {
                                prev.append('active', 'false');
                                prev.delete('page');
                                return prev;
                              });
                            } else {
                              setSearchParams((prev) => {
                                const prevStatuses = prev.getAll('false');
                                prev.delete('active');
                                prevStatuses
                                  .filter((active) => active !== 'false')
                                  .forEach((active) => {
                                    prev.append('active', active);
                                  });
                                prev.delete('active');
                                prev.delete('page');
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
        <PostureTable />
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <Accounts />,
};
