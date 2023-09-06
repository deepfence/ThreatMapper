import { useSuspenseQuery } from '@suspensive/react-query';
import { useIsFetching } from '@tanstack/react-query';
import { Suspense, useMemo, useRef, useState } from 'react';
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
            return <div className="pl-4">{info.getValue()}</div>;
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
          const selectedActiveNodesOfSameType = findSelectedActiveNodesOfType(
            rowSelectionState,
            info.row.original,
          );
          return (
            <div className="flex gap-4 items-center">
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
                  unstyled
                >
                  <Button variant="flat" size="md">
                    Configure Scan on all active {nodeText}
                  </Button>
                </DFLink>
              ) : null}
              {!rowSelectionState[info.row.original.id] &&
              selectedActiveNodesOfSameType.length ? (
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/onboard/scan/choose', {
                      state: selectedActiveNodesOfSameType,
                    });
                  }}
                  className="flex items-center"
                  unstyled
                >
                  <Button variant="flat" size="md">
                    Configure Scan on {selectedActiveNodesOfSameType.length} {nodeText}
                  </Button>
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
          if (!info.row.original.active) {
            return '';
          }
          return (
            <DFLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate('/onboard/scan/choose', {
                  state: [info.row.original],
                });
              }}
              unstyled
              className="flex items-center"
            >
              <Button variant="flat" size="md">
                Configure Scan
              </Button>
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
        noDataElement={
          <TableNoDataElement text="No connectors found, please add new connector" />
        }
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
              className: 'bg-gray-50 dark:bg-bg-side-panel',
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
  const numFetching = useIsFetching();

  return (
    <div className="flex gap-2 mb-2 items-center justify-end">
      <Button
        size="sm"
        variant="flat"
        loading={!!numFetching}
        startIcon={
          <span className="w-4 h-4">
            <RefreshIcon />
          </span>
        }
        onClick={() => {
          invalidateAllQueries();
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

function findSelectedActiveNodesOfType(
  selectionState: RowSelectionState,
  data: OnboardConnectionNode,
): OnboardConnectionNode[] {
  const selectedNodes: OnboardConnectionNode[] = [];
  data.connections?.forEach((node) => {
    if (node.id in selectionState && node.active) {
      selectedNodes.push(node);
    }
  });
  return selectedNodes;
}
