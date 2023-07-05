import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useMemo, useRef, useState } from 'react';
import {
  HiChevronDown,
  HiChevronRight,
  HiCubeTransparent,
  HiRefresh,
} from 'react-icons/hi';
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
  TableSkeleton,
  Tabs,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { NoConnectors } from '@/components/hosts-connector/NoConnectors';
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
            <TableSkeleton rows={4} columns={5} size="compact" className="mt-8" />
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
                  <HiCubeTransparent className="mr-2" /> Configure Scan on all {nodeText}
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
                  <HiCubeTransparent className="mr-2" /> Configure Scan on{' '}
                  {selectedNodesOfSameType.length} {nodeText}
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
              <HiCubeTransparent className="mr-2" /> Configure Scan
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
        size="compact"
        data={data}
        noDataText="No connectors found"
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
        startIcon={<HiRefresh />}
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
