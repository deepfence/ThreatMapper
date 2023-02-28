import cx from 'classnames';
import { capitalize, memoize, partition, toNumber } from 'lodash-es';
import { RefObject, useCallback, useMemo, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { FaCopyright, FaEye, FaPlay, FaSlack, FaVoteYea } from 'react-icons/fa';
import { FiFilter } from 'react-icons/fi';
import {
  HiChevronDown,
  HiChevronRight,
  HiDotsVertical,
  HiOutlineBookOpen,
  HiOutlineEye,
  HiPlus,
  HiRefresh,
} from 'react-icons/hi';
import {
  Form,
  LoaderFunctionArgs,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from 'react-router-dom';
import {
  Button,
  Card,
  createColumnHelper,
  Dropdown,
  DropdownItem,
  ExpandedState,
  getRowExpanderColumn,
  getRowSelectionColumn,
  IconButton,
  ModalHeader,
  RowSelectionState,
  Select,
  SelectItem,
  SlidingModal,
  Table,
} from 'ui-components';

import { getCloudNodesApiClient } from '@/api/api';
import LogoAws from '@/assets/logo-aws.svg';
import LogoAwsWhite from '@/assets/logo-aws-white.svg';
import LogoAzure from '@/assets/logo-azure.svg';
import LogoGoogle from '@/assets/logo-google.svg';
import LogoK8 from '@/assets/logo-k8.svg';
import LogoLinux from '@/assets/logo-linux.svg';
import { DFLink } from '@/components/DFLink';
import { POSTURE_SEVERITY_COLORS } from '@/constants/charts';
import { Mode, useTheme } from '@/theme/ThemeContext';
import { ApiError, makeRequest } from '@/utils/api';

enum ActionEnumType {
  START_SCAN = 'start_scan',
  VIEW_SCAN_RESULT = 'view_scan_result',
  VIEW_INVENTORY = 'view_inventory',
  REFRESH_DATA = 'refresh_data',
}

interface FocusableElement {
  focus(options?: FocusOptions): void;
}
export interface AccountData {
  id: string;
  urlId: string;
  urlType: string;
  accountType: string;
  accounts?: Array<AccountData>;
  count?: number;
  accountId?: string;
  active?: boolean;
  compliancePercentage?: number;
  alarm?: number;
  info?: number;
  ok?: number;
  skip?: number;
  action?: null;
  startScan?: null;
}

type LoaderDataType = {
  error?: string;
  message?: string;
  data?: AccountData[];
};

const getAccountSearch = (searchParams: URLSearchParams) => {
  return searchParams.getAll('account');
};
function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = toNumber(searchParams.get('page') ?? '0');
  return isFinite(page) && !isNaN(page) && page > 0 ? page : 0;
}
function findSelectedNodesOfType(
  selectionState: RowSelectionState,
  data: AccountData,
): AccountData[] {
  const selectedNodes: AccountData[] = [];
  data.accounts?.forEach((node) => {
    if (node.id in selectionState) {
      selectedNodes.push(node);
    }
  });
  return selectedNodes;
}
const logoMap = (accountType: string, mode: Mode) => {
  const map = {
    aws: {
      label: 'AWS',
      icon: mode === 'dark' ? LogoAwsWhite : LogoAws,
    },
    azure: {
      label: 'Azure',
      icon: LogoGoogle,
    },
    gcp: {
      label: 'GCP',
      icon: LogoAzure,
    },
    kubernetes: {
      label: 'KUBERNETES',
      icon: LogoK8,
    },
    host: {
      label: 'HOSTS',
      icon: LogoLinux,
    },
  };
  return map[accountType];
};
const PAGE_SIZE = 15;

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
        cloud_provider: 'aws',
        compliance_percentage: '0.00',
        active: 'true',
      },
      {
        node_id: 'cloud-node-aws-122565780892',
        node_name: '122565780892',
        cloud_provider: 'aws',
        compliance_percentage: '0.00',
        active: 'true',
      },
      {
        node_id: 'cloud-node-aws-org-122565780891',
        node_name: '122565780891',
        cloud_provider: 'aws-org',
        compliance_percentage: '0.00',
        active: 'true',
      },
      {
        node_id: 'cloud-node-aws-org-122565780892',
        node_name: '122565780892',
        cloud_provider: 'aws-org',
        compliance_percentage: '0.00',
        active: 'true',
      },
      {
        node_id: 'cloud-node-aws-org-122565780893',
        node_name: '122565780893',
        cloud_provider: 'aws-org',
        compliance_percentage: '0.00',
        active: 'true',
      },
    ],
    total: 5,
  };
  const data: LoaderDataType['data'] = [];
  if (awsResults.total) {
    const [multiAccounts, nonMultiAccounts] = partition(
      awsResults.cloud_node_accounts_info,
      (el) => {
        return el.cloud_provider === 'aws-org';
      },
    );
    if (multiAccounts.length) {
      data.push({
        id: 'aws_org',
        urlId: 'aws_org',
        urlType: 'aws_org',
        accountType: 'AWS ORG',
        count: multiAccounts.length,
        accounts: (
          multiAccounts?.map((result) => ({
            id: `aws-${result.node_id}`,
            urlId: result.node_id ?? '',
            accountType: 'AWS ORG',
            urlType: 'aws_org',
            accountId: result.node_name ?? '-',
            active: !!result.active,
            compliancePercentage: 55,
            alarm: 5,
            info: 4,
            ok: 3,
            skip: 2,
          })) ?? []
        ).sort((a, b) => {
          return (a.accountId ?? '').localeCompare(b.accountId ?? '');
        }),
      });
    }
    if (nonMultiAccounts.length) {
      data.push({
        id: 'aws',
        urlId: 'aws',
        urlType: 'aws',
        accountType: 'AWS',
        count: nonMultiAccounts.length,
        accounts: (
          nonMultiAccounts.map((result) => ({
            id: `aws-${result.node_id}`,
            urlId: result.node_id ?? '',
            accountType: 'AWS',
            urlType: 'aws',
            accountId: result.node_name ?? '-',
            active: !!result.active,
            compliancePercentage: 55,
            alarm: 5,
            info: 4,
            ok: 3,
            skip: 2,
          })) ?? []
        ).sort((a, b) => {
          return (a.accountId ?? '').localeCompare(b.accountId ?? '');
        }),
      });
    }
  }
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
              label={'Account Type'}
              placeholder="Select Account Type"
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
              {['Aws', 'Azure', 'Google', 'Kubernetes', 'Linux hosts'].map(
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

const ActionDropdown = ({
  icon,
  id,
  label,
}: {
  icon: React.ReactNode;
  id: string;
  label?: string;
}) => {
  return (
    <>
      <Dropdown
        triggerAsChild={true}
        align="end"
        content={
          <>
            <DropdownItem className="text-sm">
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <HiOutlineEye />
                </IconContext.Provider>
                View scan results
              </span>
            </DropdownItem>
            <DropdownItem className="text-sm">
              <span className="flex items-center gap-x-2 text-gray-700 dark:text-gray-400">
                <IconContext.Provider
                  value={{ className: 'text-gray-700 dark:text-gray-400' }}
                >
                  <HiOutlineBookOpen />
                </IconContext.Provider>
                View inventory
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

const PostureTable = ({ data = [] }: LoaderDataType) => {
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedState, setExpandedState] = useState<ExpandedState>(true);
  const columnHelper = createColumnHelper<AccountData>();
  const columns = useMemo(
    () => [
      getRowExpanderColumn(columnHelper, {
        minSize: 35,
        size: 35,
        maxSize: 35,
        cell: ({ row }) => {
          return row.getCanExpand() ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                row.getToggleExpandedHandler()();
              }}
            >
              {row.getIsExpanded() ? <HiChevronDown /> : <HiChevronRight />}
            </button>
          ) : null;
        },
      }),
      getRowSelectionColumn(columnHelper, {
        minSize: 30,
        size: 30,
        maxSize: 30,
        header: () => null,
      }),
      columnHelper.accessor('accountType', {
        cell: (cell) => {
          if (!cell.row.original.count) {
            return cell.getValue();
          }
          let nodeText = '';
          switch (cell.row.original.id) {
            case 'aws':
              nodeText = 'accounts';
              break;
            case 'hosts':
              nodeText = 'hosts';
              break;
            case 'kubernetesCluster':
              nodeText = 'clusters';
              break;
            case 'registry':
              nodeText = 'registries';
              break;
            default:
              nodeText = 'items';
          }
          const selectedNodesOfSameType = findSelectedNodesOfType(
            rowSelectionState,
            cell.row.original,
          );
          return (
            <div className="flex gap-4">
              {cell.getValue()} ({cell.row.original.count ?? 0} {nodeText})
              {!rowSelectionState[cell.row.original.id] &&
              selectedNodesOfSameType.length ? (
                <ActionDropdown
                  icon={<HiDotsVertical />}
                  id={cell.row.original.accountId ?? ''}
                />
              ) : null}
            </div>
          );
        },
        header: () => 'Account Type',
        minSize: 100,
        size: 150,
        maxSize: 150,
      }),
      columnHelper.accessor('accountId', {
        minSize: 150,
        size: 150,
        maxSize: 150,
        cell: (cell) => cell.getValue(),
        header: () => 'Account Id',
      }),
      columnHelper.accessor('compliancePercentage', {
        minSize: 100,
        size: 100,
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
      columnHelper.accessor('alarm', {
        minSize: 60,
        size: 60,
        maxSize: 60,
        header: () => <div className="flex justify-end">Alarm</div>,
        cell: (cell) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{cell.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: POSTURE_SEVERITY_COLORS['alarm'],
              }}
            ></div>
          </div>
        ),
      }),
      columnHelper.accessor('info', {
        minSize: 60,
        size: 60,
        maxSize: 60,
        header: () => <div className="flex justify-end">Info</div>,
        cell: (cell) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{cell.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: POSTURE_SEVERITY_COLORS['info'],
              }}
            ></div>
          </div>
        ),
      }),
      columnHelper.accessor('ok', {
        minSize: 60,
        size: 60,
        maxSize: 60,
        header: () => <div className="flex justify-end">Ok</div>,
        cell: (cell) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{cell.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: POSTURE_SEVERITY_COLORS['ok'],
              }}
            ></div>
          </div>
        ),
      }),
      columnHelper.accessor('skip', {
        minSize: 60,
        size: 60,
        maxSize: 60,
        header: () => <div className="flex justify-end">Skip</div>,
        cell: (cell) => (
          <div className="flex items-center justify-end gap-x-2 tabular-nums">
            <span className="truncate">{cell.getValue()}</span>
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: POSTURE_SEVERITY_COLORS['skip'],
              }}
            ></div>
          </div>
        ),
      }),
      columnHelper.accessor('startScan', {
        enableSorting: false,
        cell: (info) => (
          <DFLink to={'#'} className="flex items-center gap-x-2">
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
          <ActionDropdown
            icon={<HiDotsVertical />}
            id={cell.row.original.accountId ?? ''}
          />
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
    <Table
      size="sm"
      data={data}
      columns={columns}
      expanded={expandedState}
      onExpandedChange={setExpandedState}
      enableRowSelection
      rowSelectionState={rowSelectionState}
      onRowSelectionChange={setRowSelectionState}
      getSubRows={(row) => row.accounts ?? []}
      getTdProps={(cell) => {
        if (cell.row.original.count) {
          let colSpan = 0;
          if ([0, 1].includes(cell.row.getAllCells().indexOf(cell))) {
            colSpan = 1;
          } else if (cell.row.getAllCells().indexOf(cell) === 2) {
            colSpan = 5;
          }
          return {
            colSpan,
            className: 'bg-gray-50 dark:bg-gray-700',
          };
        }
        return {};
      }}
      getTrProps={(row) => {
        if (row.original.count) {
          return {
            className: 'cursor-pointer',
            onClick: () => {
              row.toggleExpanded();
            },
          };
        }
        return {};
      }}
      getRowId={(row) => row.id}
    />
  );
};

const AccountSummary = () => {
  const { mode } = useTheme();
  return (
    <>
      {[
        {
          id: 'aws',
          name: 'AWS',
          totalAccounts: 14,
          totalResources: 99,
          totalScans: 23,
          compliancePercentage: 13,
        },
        {
          id: 'azure',
          name: 'AZURE',
          totalAccounts: 4,
          totalResources: 34,
          totalScans: 30,
          compliancePercentage: 35,
        },
        {
          id: 'gcp',
          name: 'GCP',
          totalAccounts: 32,
          totalResources: 23,
          totalScans: 40,
          compliancePercentage: 76,
        },
        {
          id: 'kubernetes',
          name: 'Kubernetes',
          totalAccounts: 11,
          totalResources: 200,
          totalScans: 76,
          compliancePercentage: 40,
        },
        {
          id: 'host',
          name: 'Hosts',
          totalAccounts: 5,
          totalResources: 700,
          totalScans: 200,
          compliancePercentage: 90,
        },
      ].map((cloud) => {
        const {
          id,
          name,
          totalAccounts,
          totalResources,
          totalScans,
          compliancePercentage,
        } = cloud;
        const account = logoMap(id, mode);
        return (
          <Card key={id} className="p-4 flex flex-col gap-y-1">
            <div className="flex items-center gap-x-6">
              <div className="flex flex-col items-center justify-center basis-full gap-y-4">
                <img src={account.icon} alt="logo" width={40} height={40} />
                <div className="flex flex-col items-center justify-center gap-x-4">
                  <span
                    className={cx('text-md rounded-lg px-1 font-medium', {
                      'bg-[#de425b]/30 dark:bg-[#de425b]/20 text-[#de425b] dark:text-[#de425b]':
                        compliancePercentage > 60 && compliancePercentage < 100,
                      'bg-[#ffd577]/30 dark:bg-[##ffd577]/10 text-yellow-400 dark:text-[#ffd577]':
                        compliancePercentage > 30 && compliancePercentage < 90,
                      'bg-[#0E9F6E]/20 dark:bg-[#0E9F6E]/20 text-[#0E9F6E] dark:text-[#0E9F6E]':
                        compliancePercentage < 30,
                    })}
                  >
                    {compliancePercentage}%
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Compliance
                  </span>
                </div>
              </div>
              <div className="flex flex-col basis-full ">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                  {totalAccounts}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">Accounts</span>
              </div>
              <div className="flex flex-col basis-full ">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                  {totalResources}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Resources
                </span>
              </div>

              <div className="flex flex-col basis-full ">
                <span className="text-lg text-gray-900 dark:text-gray-200 font-light">
                  {totalScans}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">Scans</span>
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
};

const Posture = () => {
  const loaderData = useLoaderData() as LoaderDataType;
  const elementToFocusOnClose = useRef(null);
  const [showFilter, setShowFilter] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const isFilterApplied = searchParams.has('');

  return (
    <div>
      <FilterModal
        showFilter={showFilter}
        setShowFilter={setShowFilter}
        elementToFocusOnClose={elementToFocusOnClose.current}
      />
      <div className="flex p-1 pl-2 w-full items-center shadow bg-white dark:bg-gray-800">
        <span className="text-md font-medium text-gray-700 dark:text-gray-200 uppercase">
          Posture
        </span>
        <div className="ml-auto flex relative gap-x-4">
          <div>
            <Button size="xs" color="primary" outline endIcon={<HiPlus />}>
              Add connector
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
      <div className="grid grid-cols-[350px_1fr] p-2 gap-x-2">
        <div className="grid gap-2">
          <AccountSummary />
        </div>
        <PostureTable data={loaderData.data ?? []} />
      </div>
    </div>
  );
};

export const module = {
  loader,
  element: <Posture />,
};
