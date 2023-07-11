import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useRef, useState } from 'react';
import { useRevalidator } from 'react-router-dom';
import { useInterval } from 'react-use';
import {
  Button,
  createColumnHelper,
  ExpandedState,
  getRowExpanderColumn,
  getRowSelectionColumn,
  RowSelectionState,
  Table,
  TableNoDataElement,
  TableSkeleton,
  Tabs,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { NoConnectors } from '@/components/hosts-connector/NoConnectors';
import { CaretDown } from '@/components/icons/common/CaretDown';
import { RefreshIcon } from '@/components/icons/common/Refresh';
import { connectorLayoutTabs } from '@/features/onboard/layouts/ConnectorsLayout';
import { invalidateAllQueries, queries } from '@/queries';
import { usePageNavigation } from '@/utils/usePageNavigation';

export interface OnboardConnectionNode {
  id: string;
  // url friendly id of the node
  urlId: string;
  // url friendly api type of the node
  urlType: string;
  // applies only to the parent node
  count?: number;
  // account type to display in the table
  accountType: string;
  // connection method to display in the table
  connectionMethod?: string;
  // account id to display in the table
  accountId?: string;
  active?: boolean;
  connections?: OnboardConnectionNode[];
}

const useGetConnectors = () => {
  return useSuspenseQuery({
    ...queries.onboard.listConnectors(),
    keepPreviousData: true,
  });
};

const SnowFlakeIcon = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.0505 33.6102C17.7852 33.6102 17.5309 33.5048 17.3434 33.3173C17.1558 33.1297 17.0505 32.8754 17.0505 32.6102V3.37015C17.0171 3.22371 17.0171 3.07162 17.0506 2.92519C17.084 2.77876 17.1501 2.64175 17.2437 2.52433C17.3374 2.40691 17.4563 2.3121 17.5916 2.24695C17.727 2.18179 17.8753 2.14795 18.0255 2.14795C18.1757 2.14795 18.3239 2.18179 18.4593 2.24695C18.5946 2.3121 18.7135 2.40691 18.8072 2.52433C18.9009 2.64175 18.9669 2.77876 19.0003 2.92519C19.0338 3.07162 19.0338 3.22371 19.0005 3.37015V32.6302C18.9957 32.8835 18.895 33.1255 18.7186 33.3074C18.5423 33.4893 18.3035 33.5975 18.0505 33.6102Z"
        fill="currentColor"
      />
      <path
        d="M18.0605 10.0702L14.5205 6.54015C14.3342 6.35279 14.2297 6.09934 14.2297 5.83515C14.2297 5.57097 14.3342 5.31752 14.5205 5.13015C14.7078 4.9439 14.9613 4.83936 15.2255 4.83936C15.4896 4.83936 15.7431 4.9439 15.9305 5.13015L18.0605 7.25015L20.1805 5.13015C20.3678 4.9439 20.6213 4.83936 20.8855 4.83936C21.1496 4.83936 21.4031 4.9439 21.5905 5.13015C21.7767 5.31752 21.8813 5.57097 21.8813 5.83515C21.8813 6.09934 21.7767 6.35279 21.5905 6.54015L18.0605 10.0702Z"
        fill="currentColor"
      />
      <path
        d="M20.8505 31.1702C20.5881 31.169 20.3367 31.0649 20.1505 30.8802L18.0005 28.7602L15.9005 30.8802C15.7131 31.0664 15.4596 31.1709 15.1955 31.1709C14.9313 31.1709 14.6778 31.0664 14.4905 30.8802C14.3967 30.7872 14.3223 30.6766 14.2716 30.5547C14.2208 30.4329 14.1947 30.3022 14.1947 30.1702C14.1947 30.0381 14.2208 29.9074 14.2716 29.7856C14.3223 29.6637 14.3967 29.5531 14.4905 29.4602L18.0005 25.9302L21.5405 29.4602C21.6342 29.5531 21.7086 29.6637 21.7594 29.7856C21.8101 29.9074 21.8363 30.0381 21.8363 30.1702C21.8363 30.3022 21.8101 30.4329 21.7594 30.5547C21.7086 30.6766 21.6342 30.7872 21.5405 30.8802C21.3567 31.0625 21.1093 31.1665 20.8505 31.1702Z"
        fill="currentColor"
      />
      <path
        d="M30.9205 26.5002C30.7453 26.5014 30.5729 26.4565 30.4205 26.3702L4.42046 11.3702C4.19241 11.2349 4.02742 11.0145 3.96179 10.7576C3.89615 10.5007 3.93524 10.2283 4.07046 10.0002C4.13662 9.8864 4.22459 9.78683 4.32931 9.70714C4.43404 9.62745 4.55346 9.56921 4.68073 9.53577C4.80801 9.50232 4.94063 9.49433 5.071 9.51224C5.20137 9.53015 5.32692 9.57362 5.44046 9.64015L31.4405 24.6402C31.6331 24.7493 31.7841 24.9193 31.8697 25.1235C31.9553 25.3277 31.9707 25.5546 31.9135 25.7685C31.8563 25.9824 31.7297 26.1713 31.5536 26.3055C31.3775 26.4397 31.1619 26.5117 30.9405 26.5102L30.9205 26.5002Z"
        fill="currentColor"
      />
      <path
        d="M6.00046 15.3702C5.73524 15.4046 5.46719 15.3323 5.25528 15.1692C5.04336 15.006 4.90494 14.7654 4.87046 14.5002C4.83598 14.2349 4.90827 13.9669 5.07143 13.755C5.23459 13.5431 5.47524 13.4046 5.74046 13.3702L8.64046 12.5902L7.84046 9.73015C7.80113 9.60184 7.78802 9.46692 7.80193 9.33344C7.81583 9.19995 7.85647 9.07063 7.92141 8.95318C7.98634 8.83573 8.07426 8.73256 8.17992 8.6498C8.28557 8.56704 8.40681 8.5064 8.53639 8.47149C8.66598 8.43657 8.80127 8.4281 8.9342 8.44658C9.06713 8.46505 9.19498 8.51009 9.31013 8.57902C9.42529 8.64795 9.52539 8.73935 9.60447 8.84778C9.68356 8.95621 9.74001 9.07945 9.77046 9.21015L11.0705 14.0002L6.24046 15.3302C6.1629 15.3553 6.08201 15.3688 6.00046 15.3702Z"
        fill="currentColor"
      />
      <path
        d="M27.0505 27.5402C26.8234 27.5473 26.6006 27.477 26.4188 27.3407C26.2371 27.2043 26.1071 27.0102 26.0505 26.7902L24.8005 22.0002L29.6205 20.7002C29.7488 20.6608 29.8837 20.6477 30.0172 20.6616C30.1507 20.6755 30.28 20.7162 30.3974 20.7811C30.5149 20.846 30.6181 20.934 30.7008 21.0396C30.7836 21.1453 30.8442 21.2665 30.8791 21.3961C30.914 21.5257 30.9225 21.661 30.904 21.7939C30.8856 21.9268 30.8405 22.0547 30.7716 22.1698C30.7027 22.285 30.6113 22.3851 30.5028 22.4642C30.3944 22.5433 30.2712 22.5997 30.1405 22.6302L27.2405 23.4102L28.0205 26.3102C28.0876 26.5661 28.0505 26.8381 27.9175 27.0668C27.7844 27.2955 27.5661 27.4621 27.3105 27.5302C27.225 27.5486 27.137 27.552 27.0505 27.5402Z"
        fill="currentColor"
      />
      <path
        d="M4.94046 26.5002C4.71904 26.5017 4.50337 26.4297 4.32727 26.2955C4.15117 26.1613 4.0246 25.9724 3.96741 25.7585C3.91021 25.5446 3.92563 25.3177 4.01124 25.1135C4.09685 24.9093 4.24782 24.7393 4.44046 24.6302L30.4405 9.63015C30.6689 9.49894 30.9398 9.46315 31.1945 9.53056C31.4491 9.59796 31.6669 9.76312 31.8005 9.99015C31.867 10.1037 31.9105 10.2292 31.9284 10.3596C31.9463 10.49 31.9383 10.6226 31.9049 10.7499C31.8714 10.8772 31.8132 10.9966 31.7335 11.1013C31.6538 11.206 31.5542 11.294 31.4405 11.3602L5.44046 26.3602C5.28903 26.45 5.11655 26.4983 4.94046 26.5002Z"
        fill="currentColor"
      />
      <path
        d="M8.81046 27.5402C8.72446 27.5553 8.63647 27.5553 8.55046 27.5402C8.2948 27.4721 8.07654 27.3055 7.94346 27.0768C7.81039 26.8481 7.77335 26.5761 7.84046 26.3202L8.62046 23.4202L5.72046 22.6402C5.58856 22.6079 5.46461 22.5491 5.35616 22.4674C5.24771 22.3857 5.15704 22.2828 5.08967 22.1649C5.0223 22.047 4.97965 21.9166 4.96431 21.7817C4.94897 21.6468 4.96127 21.5102 5.00046 21.3802C5.0341 21.2525 5.0927 21.1327 5.17286 21.0278C5.25303 20.9229 5.35318 20.8349 5.46753 20.7689C5.58188 20.7029 5.70818 20.6602 5.83912 20.6432C5.97007 20.6263 6.10307 20.6354 6.23046 20.6702L11.0705 22.0002L9.77046 26.8202C9.70988 27.0279 9.58356 27.2103 9.41046 27.3402C9.23737 27.47 9.02683 27.5402 8.81046 27.5402Z"
        fill="currentColor"
      />
      <path
        d="M29.8805 15.3702C29.7943 15.384 29.7066 15.384 29.6205 15.3702L24.8005 14.0002L26.0905 9.17015C26.1164 9.03302 26.1708 8.90284 26.2501 8.78799C26.3295 8.67314 26.4319 8.57617 26.551 8.50331C26.67 8.43046 26.803 8.38332 26.9414 8.36495C27.0797 8.34658 27.2204 8.35738 27.3543 8.39665C27.4883 8.43592 27.6125 8.50279 27.719 8.59296C27.8256 8.68313 27.9121 8.79461 27.9729 8.92022C28.0338 9.04582 28.0677 9.18278 28.0724 9.32227C28.0772 9.46176 28.0526 9.6007 28.0005 9.73015L27.2205 12.6202L30.1205 13.4002C30.3857 13.4346 30.6263 13.5731 30.7895 13.785C30.9526 13.9969 31.0249 14.2649 30.9905 14.5302C30.956 14.7954 30.8176 15.036 30.6056 15.1992C30.3937 15.3623 30.1257 15.4346 29.8605 15.4002L29.8805 15.3702Z"
        fill="currentColor"
      />
    </svg>
  );
};
function MyConnectors() {
  const { navigate } = usePageNavigation();
  const navigatedRef = useRef(false);

  useInterval(() => {
    invalidateAllQueries();
  }, 300000);

  return (
    <Tabs
      value={'my-connectors'}
      tabs={connectorLayoutTabs}
      onValueChange={() => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        navigate(`/onboard/connectors/add-connectors`);
      }}
      size="md"
    >
      <div className="h-full dark:text-white">
        <Suspense
          fallback={
            <TableSkeleton rows={4} columns={10} size="default" className="mt-8" />
          }
        >
          <MyConnectorsTable />
        </Suspense>
      </div>
    </Tabs>
  );
}

function MyConnectorsTable() {
  const [expandedState, setExpandedState] = useState<ExpandedState>(true);
  const { navigate } = usePageNavigation();

  const { data } = useGetConnectors();

  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const columnHelper = createColumnHelper<OnboardConnectionNode>();
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
              {row.getIsExpanded() ? (
                <span className="w-4 h-4 block">
                  <CaretDown />
                </span>
              ) : (
                <span className="w-4 h-4 block -rotate-90">
                  <CaretDown />
                </span>
              )}
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
        cell: (info) => {
          if (!info.row.original.count) {
            return info.getValue();
          }
          let nodeText = '';
          switch (info.row.original.id) {
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
            info.row.original,
          );
          return (
            <div className="flex gap-4">
              <div className="font-semibold">
                {info.getValue()} ({info.row.original.count ?? 0} {nodeText})
              </div>
              {rowSelectionState[info.row.original.id] ? (
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/onboard/scan/choose', {
                      state: info.row.original.connections,
                    });
                  }}
                  className="flex items-center"
                >
                  <span className="mr-2 w-4 h-4">
                    <SnowFlakeIcon />
                  </span>
                  Configure Scan on all {nodeText}
                </DFLink>
              ) : null}
              {!rowSelectionState[info.row.original.id] &&
              selectedNodesOfSameType.length ? (
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/onboard/scan/choose', {
                      state: selectedNodesOfSameType,
                    });
                  }}
                  className="flex items-center"
                >
                  <span className="mr-2 w-4 h-4">
                    <SnowFlakeIcon />
                  </span>
                  Configure Scan on {selectedNodesOfSameType.length} {nodeText}
                </DFLink>
              ) : null}
            </div>
          );
        },
        header: () => 'Account Type',
        minSize: 100,
        size: 110,
        maxSize: 150,
      }),
      columnHelper.accessor('connectionMethod', {
        minSize: 100,
        size: 110,
        maxSize: 150,
        cell: (info) => info.getValue(),
        header: () => 'Connection Method',
      }),
      columnHelper.accessor('accountId', {
        minSize: 300,
        size: 310,
        maxSize: 350,
        header: () => 'Account ID',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('active', {
        minSize: 60,
        size: 60,
        maxSize: 60,
        header: () => 'Active',
        cell: (info) => {
          const value = info.getValue();
          return value ? 'Yes' : 'No';
        },
      }),
      columnHelper.display({
        minSize: 150,
        size: 170,
        maxSize: 200,
        id: 'actions',
        cell: (info) => {
          return (
            <DFLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate('/onboard/scan/choose', {
                  state: [info.row.original],
                });
              }}
              className="flex items-center"
            >
              <span className="mr-2 w-4 h-4">
                <SnowFlakeIcon />
              </span>
              Configure Scan
            </DFLink>
          );
        },
      }),
    ],
    [rowSelectionState, navigate],
  );

  if (!data?.length) {
    return <NoConnectors />;
  }
  return (
    <>
      <RefreshButton />
      <Table
        size="default"
        data={data}
        noDataElement={<TableNoDataElement text="No connectors found" />}
        columns={columns}
        expanded={expandedState}
        onExpandedChange={setExpandedState}
        enableRowSelection
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        getSubRows={(row) => row.connections ?? []}
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
    </>
  );
}

function RefreshButton() {
  const { revalidate, state } = useRevalidator();

  return (
    <div className="flex gap-2 mb-2 items-center justify-end">
      <Button
        size="sm"
        variant="flat"
        loading={state === 'loading'}
        startIcon={
          <span className="w-4 h-4">
            <RefreshIcon />
          </span>
        }
        onClick={() => {
          revalidate();
        }}
      >
        Refresh
      </Button>
    </div>
  );
}

export const module = {
  element: <MyConnectors />,
};

function findSelectedNodesOfType(
  selectionState: RowSelectionState,
  data: OnboardConnectionNode,
): OnboardConnectionNode[] {
  const selectedNodes: OnboardConnectionNode[] = [];
  data.connections?.forEach((node) => {
    if (node.id in selectionState) {
      selectedNodes.push(node);
    }
  });
  return selectedNodes;
}
