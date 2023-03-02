import cx from 'classnames';
import { capitalize, memoize, toNumber } from 'lodash-es';
import { RefObject, useMemo, useRef, useState } from 'react';
import { FaPlay, FaPlus } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import { HiArrowSmLeft, HiDotsVertical, HiOutlineEye, HiRefresh } from 'react-icons/hi';
import { IconContext } from 'react-icons/lib';
import {
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
} from 'ui-components';

import { getCloudNodesApiClient } from '@/api/api';
import { DFLink } from '@/components/DFLink';
import { POSTURE_SEVERITY_COLORS } from '@/constants/charts';
import { usePageNavigation } from '@/utils/usePageNavigation';

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
  active?: boolean;
  compliancePercentage?: number;

  action?: null;
  startScan?: null;
}

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: AccountData[];
};

const PAGE_SIZE = 15;

const getAccountSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('account');
};
function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = toNumber(searchParams.get('page') ?? '0');
  return isFinite(page) && !isNaN(page) && page > 0 ? page : 0;
}

async function getAccountsData(searchParams: URLSearchParams): Promise<LoaderDataType> {
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
  const awsResults = {
    cloud_node_accounts_info: [
      {
        node_id: 'cloud-node-aws-122565780891',
        node_name: '122565780891',
        accountType: '122565780891',
        cloud_provider: 'aws',
        compliance_percentage: '0.00',
        active: true,
      },
      {
        node_id: 'cloud-node-aws-122565780892',
        node_name: '122565780892',
        accountType: '122565780892',
        cloud_provider: 'aws',
        compliance_percentage: '0.00',
        active: true,
      },
      {
        node_id: 'cloud-node-aws-org-122565780891',
        node_name: '122565780891',
        accountType: '122565780891',
        cloud_provider: 'aws-org',
        compliance_percentage: '0.00',
        active: true,
      },
      {
        node_id: 'cloud-node-aws-org-122565780892',
        node_name: '122565780892',
        accountType: '122565780892',
        cloud_provider: 'aws-org',
        compliance_percentage: '0.00',
        active: true,
      },
      {
        node_id: 'cloud-node-aws-org-122565780893',
        accountType: '122565780893',
        node_name: '122565780893',
        cloud_provider: 'aws-org',
        compliance_percentage: '0.00',
        active: true,
      },
    ],
    total: 5,
  };
  const data: LoaderDataType['data'] = awsResults.cloud_node_accounts_info.map(
    (account) => {
      return {
        id: account.node_id,
        accountType: account.accountType,
        active: account.active,
        compliancePercetage: account.compliance_percentage,
      };
    },
  );

  return {
    data,
  };
}

const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<LoaderDataType> => {
  const searchParams = new URL(request.url).searchParams;

  // return Promise.resolve([]);
  return getAccountsData(searchParams);
};

const ActionDropdown = ({
  icon,
  id,
  label,
}: {
  icon: React.ReactNode;
  id: string;
  label?: string;
}) => {
  const { navigate } = usePageNavigation();
  const onTableAction = (action: string) => () => {
    const id = 12345;
    switch (action) {
      case ActionEnumType.VIEW_SCAN:
        navigate(`/posture/scans/${id}`);
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
              onClick={onTableAction(ActionEnumType.VIEW_SCAN)}
            >
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
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
    <Modal open={open} onOpenChange={() => setOpen(false)}>
      hello
    </Modal>
  );
};

const PostureTable = ({ data = [] }: LoaderDataType) => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const columnHelper = createColumnHelper<AccountData>();
  const [openScanConfigure, setOpemScanConfigure] = useState(false);
  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
        header: () => null,
      }),
      columnHelper.accessor('accountType', {
        cell: (cell) => (
          <DFLink to={`/posture/scan-results/accountId/scanId`}>{cell.getValue()}</DFLink>
        ),
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
                  percent < 30,
              })}
            >
              {percent}%
            </div>
          );
        },
      }),
      columnHelper.accessor('active', {
        minSize: 50,
        size: 50,
        maxSize: 50,
        header: () => 'Active',
        cell: (info) => {
          const value = info.getValue();
          return value ? 'Yes' : 'No';
        },
      }),
      columnHelper.accessor('startScan', {
        enableSorting: false,
        cell: (info) => (
          <DFLink
            to={'#'}
            className="flex items-center gap-x-2"
            onClick={() => setOpemScanConfigure(true)}
          >
            <div className="p-1.5 bg-gray-100 shrink-0 dark:bg-gray-500/10 rounded-lg">
              <div className="w-4 h-4">
                <FaPlay />
              </div>
            </div>
            <div>Start scan</div>
          </DFLink>
        ),
        header: () => 'Start action',
        minSize: 80,
        size: 80,
        maxSize: 120,
      }),
      columnHelper.accessor('action', {
        id: 'actions',
        enableSorting: false,
        cell: (cell) => (
          <ActionDropdown icon={<HiDotsVertical />} id={cell.row.original.id ?? ''} />
        ),
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
      <ScanConfigure open={openScanConfigure} setOpen={setOpemScanConfigure} />
      <Form>
        {Object.keys(rowSelectionState).length === 0 ? (
          <div className="text-sm text-gray-400 font-medium mb-3 flex justify-between">
            No rows selected
          </div>
        ) : (
          <>
            <div className="mb-1.5 flex gap-x-2">
              <DFLink to={'#'} className="flex items-center gap-x-2">
                <div className="p-1.5 bg-gray-100 shrink-0 dark:bg-gray-500/10 rounded-lg">
                  <div className="w-4 h-4">
                    <FaPlay />
                  </div>
                </div>
                <div>Start scan</div>
              </DFLink>
            </div>
          </>
        )}
      </Form>
      <Table
        size="sm"
        data={data}
        columns={columns}
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getRowId={(row) => row.id}
      />
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
        <PostureTable data={loaderData.data ?? []} />
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <Accounts />,
};
