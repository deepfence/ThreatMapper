import cx from 'classnames';
import { capitalize, memoize, toNumber } from 'lodash-es';
import { RefObject, Suspense, useMemo, useRef, useState } from 'react';
import { FaPlay, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiArrowSmLeft, HiDotsVertical, HiOutlineEye, HiRefresh } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
  Await,
  Form,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
  useRevalidator,
  useSearchParams,
} from 'react-router-dom';
import {
  Button,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  getRowSelectionColumn,
  IconButton,
  Modal,
  ModalHeader,
  RowSelectionState,
  Select,
  SelectItem,
  SlidingModal,
  Table,
  TableSkeleton,
} from 'ui-components';

import { getCloudNodesApiClient } from '@/api/api';
import { DFLink } from '@/components/DFLink';
import { ScanConfigureForm } from '@/components/forms/posture/ScanConfigureForm';
import { POSTURE_SEVERITY_COLORS } from '@/constants/charts';
import { typedDefer, TypedDeferredData } from '@/utils/router';
import { usePageNavigation } from '@/utils/usePageNavigation';

let mockData = [
  {
    id: 'cloud-node-aws-122565780891',
    accountType: '122565780891',
    cloud_provider: 'aws',
    compliancePercentage: 0,
    scanStatus: 'COMPLETE',
    active: true,
  },
  {
    id: 'cloud-node-aws-122565780892',
    accountType: '122565780892',
    cloud_provider: 'aws',
    compliancePercentage: 0,
    scanStatus: 'ERROR',
    active: true,
  },
  {
    id: 'cloud-node-aws-org-122565780891',
    accountType: '122565780891',
    cloud_provider: 'aws-org',
    compliancePercentage: 0,
    scanStatus: 'RUNNING',
    active: true,
  },
  {
    id: 'cloud-node-aws-org-122565780892',
    accountType: '122565780892',
    cloud_provider: 'aws-org',
    compliancePercentage: 0,
    scanStatus: 'RUNNING',
    active: true,
  },
  {
    id: 'cloud-node-aws-org-122565780893',
    accountType: '122565780893',
    cloud_provider: 'aws-org',
    compliancePercentage: 0,
    scanStatus: 'COMPLETE',
    active: true,
  },
];

mockData = [...mockData, ...mockData, ...mockData];

enum ActionEnumType {
  START_SCAN = 'start_scan',
  VIEW_SCAN = 'view_scan',
  VIEW_INVENTORY = 'view_inventory',
  REFRESH_DATA = 'refresh_data',
}

interface FocusableElement {
  focus(options?: FocusOptions): void;
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
  data: Awaited<ReturnType<typeof getAccountsData>>;
};

const PAGE_SIZE = 15;

const getAccountSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('account');
};
function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = toNumber(searchParams.get('page') ?? '0');
  return isFinite(page) && !isNaN(page) && page > 0 ? page : 0;
}

async function getAccountsData(searchParams: URLSearchParams): Promise<{
  accounts: AccountData[];
  currentPage: number;
  totalRows: number;
  message?: string;
}> {
  const severity = getAccountSearch(searchParams);
  const page = getPageFromSearchParams(searchParams);

  // const awsResultsPromise = makeRequest({
  //   apiFunction: getCloudNodesApiClient().listCloudNodeAccount,
  //   apiArgs: [
  //     {
  //       modelCloudNodeAccountsListReq: {
  //         cloud_provider: 'aws',
  //         window: {
  //           offset: page * PAGE_SIZE,
  //           size: PAGE_SIZE,
  //         },
  //       },
  //     },
  //   ],
  // });
  // const [awsResults] = await Promise.all([awsResultsPromise]);
  // if (ApiError.isApiError(awsResults)) {
  //   // TODO(manan) handle error cases
  //   return {
  //     data: [],
  //   };
  // }
  //   const awsResults = {
  //     cloud_node_accounts_info: mockData,
  //     total: 5,
  //   };
  //   const data: LoaderDataType['data'] = awsResults.cloud_node_accounts_info.map(
  //     (account) => {
  //       return {
  //         id: account.node_id,
  //         accountType: account.accountType,
  //         scanStatus: account.scan_status,
  //         active: account.active,
  //         compliancePercetage: account.compliance_percentage,
  //       };
  //     },
  //   );
  return {
    accounts: mockData,
    currentPage: 1,
    totalRows: 50,
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<TypedDeferredData<LoaderDataType>> => {
  const searchParams = new URL(request.url).searchParams;

  // return Promise.resolve([]);
  return typedDefer({
    data: getAccountsData(searchParams),
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

const ScanConfigure = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <Modal
      open={open}
      width="w-full"
      title="Configure your scan option"
      onOpenChange={() => setOpen(false)}
    >
      <div className="p-4 pt-0">
        <ScanConfigureForm
          loading={false}
          hideTable={false}
          data={{
            urlIds: ['123', '456'],
            urlType: 'host',
          }}
        />
      </div>
    </Modal>
  );
};

const PostureTable = () => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<AccountData>();
  const [openScanConfigure, setOpenScanConfigure] = useState(false);
  const loaderData = useLoaderData() as LoaderDataType;

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
        header: () => null,
      }),
      columnHelper.accessor('accountType', {
        cell: (cell) => {
          const isScanComplete =
            cell.row.original.scanStatus?.toLowerCase() === 'complete';
          const WrapperComponent = ({ children }: { children: React.ReactNode }) => {
            if (isScanComplete) {
              return (
                <DFLink to={`/posture/scan-results/accountId/scanId`}>{children}</DFLink>
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
        size: 100,
        maxSize: 120,
      }),
      columnHelper.accessor('compliancePercentage', {
        minSize: 80,
        size: 80,
        maxSize: 100,
        header: () => 'Compliance %',
        cell: (cell) => {
          const percent = cell.getValue() ?? 0;
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
              {percent}%
            </div>
          );
        },
      }),
      columnHelper.accessor('active', {
        minSize: 60,
        size: 70,
        maxSize: 80,
        header: () => 'Active',
        cell: (info) => {
          const value = info.getValue();
          return value ? 'Yes' : 'No';
        },
      }),
      columnHelper.accessor('scanStatus', {
        cell: (info) => (
          <span
            className={cx({
              'text-green-500': info.getValue().toLowerCase() === 'complete',
              'text-red-500': info.getValue().toLowerCase() === 'error',
              'text-blue-500':
                info.getValue().toLowerCase() !== 'complete' &&
                info.getValue().toLowerCase() !== 'error',
            })}
          >
            {info.getValue()}
          </span>
        ),
        header: () => 'Status',
        minSize: 50,
        size: 70,
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
            onClick={() => setOpenScanConfigure(true)}
          >
            Start scan
          </Button>
        ),
        header: () => 'Start action',
        minSize: 80,
        size: 80,
        maxSize: 120,
      }),
      columnHelper.display({
        id: 'actions',
        enableSorting: false,
        cell: (cell) => {
          const isScanComplete =
            cell.row.original.scanStatus?.toLowerCase() === 'complete';
          return (
            <ActionDropdown
              icon={<HiDotsVertical />}
              id={cell.row.original.id ?? ''}
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
      <ScanConfigure open={openScanConfigure} setOpen={setOpenScanConfigure} />
      <Suspense fallback={<TableSkeleton columns={6} rows={10} size={'md'} />}>
        <Await resolve={loaderData.data}>
          {(resolvedData: LoaderDataType['data']) => {
            return (
              <>
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
                          onClick={() => setOpenScanConfigure(true)}
                        >
                          Start scan
                        </Button>
                      </div>
                    </>
                  )}
                </Form>
                <Table
                  size="sm"
                  data={resolvedData.accounts}
                  columns={columns}
                  enableRowSelection
                  enablePagination
                  manualPagination
                  totalRows={resolvedData.totalRows}
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
                  pageSize={PAGE_SIZE}
                  rowSelectionState={rowSelectionState}
                  onRowSelectionChange={setRowSelectionState}
                  getRowId={(row) => row.id}
                />
              </>
            );
          }}
        </Await>
      </Suspense>
    </>
  );
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

const FilterModal = memoize(
  ({
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
        width={'w-[400px]'}
      >
        <Form className="flex flex-col p-4 gap-y-6">
          <fieldset>
            <Select
              noPortal
              name="account"
              label={'Account'}
              placeholder="Select Account"
              value={searchParams.getAll('account')}
              sizing="xs"
              onChange={(value) => {
                setSearchParams((prev) => {
                  prev.delete('account');
                  value.forEach((language) => {
                    prev.append('account', language);
                  });
                  prev.delete('page');
                  return prev;
                });
              }}
            >
              {['account 1', 'account 2', 'account 3', 'account 4', 'account 4'].map(
                (account: string) => {
                  return (
                    <SelectItem value={account} key={account}>
                      {capitalize(account)}
                    </SelectItem>
                  );
                },
              )}
            </Select>
          </fieldset>
        </Form>
      </SlidingModal>
    );
  },
);

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
    account: string;
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
                navigate(`/posture/add-connection/${routeParams.account}`);
              }}
            >
              Add {routeParams.account === 'kubernetes' && 'Cluster'}
              {routeParams.account === 'host' && 'Host'}
              {routeParams.account !== 'kubernetes' &&
                routeParams.account !== 'host' &&
                'Account'}
            </Button>
          </div>
          <RefreshApiButton />
          <div>
            {isFilterApplied && (
              <span className="absolute -left-[2px] -top-[2px] inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
            )}

            <IconButton
              className="ml-auto rounded-lg"
              size="xs"
              outline
              color="primary"
              ref={elementToFocusOnClose}
              onClick={() => {
                setShowFilter(true);
              }}
              icon={<FiFilter />}
            />
          </div>
        </div>
      </div>
      <FilterModal
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        elementToFocusOnClose={elementToFocusOnClose.current}
      />
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
