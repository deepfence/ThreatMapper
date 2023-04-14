import classNames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HiMinus, HiPlus } from 'react-icons/hi';
import { useFetcher, useSearchParams } from 'react-router-dom';
import { useInterval } from 'react-use';
import {
  Badge,
  Button,
  CircleSpinner,
  createColumnHelper,
  ExpandedState,
  getRowSelectionColumn,
  Popover,
  RowSelectionState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { DetailedNodeSummary } from '@/api/generated';
import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { DFLink } from '@/components/DFLink';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { TopologyActionData } from '@/features/topology/data-components/topologyAction';
import { TopologyAction } from '@/features/topology/types/graph';
import { TopologyTreeData } from '@/features/topology/types/table';
import { itemExpands, itemHasDetails } from '@/features/topology/utils/expand-collapse';
import {
  getExpandedIdsFromTreeData,
  getIdsFromTreeData,
  GraphStorageManager,
  NodeType,
} from '@/features/topology/utils/topology-data';

export function TopologyTable() {
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  const { isRefreshInProgress, treeData, action, ...graphDataManagerFunctions } =
    useTableDataManager();
  const graphDataManagerFunctionsRef = useRef(graphDataManagerFunctions);

  graphDataManagerFunctionsRef.current = graphDataManagerFunctions;

  const [expandedState, setExpandedState] = useState<ExpandedState>({});
  const [sortingState, setSortingState] = useState<SortingState>([
    {
      id: 'label',
      desc: false,
    },
  ]);
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();

  const columnHelper = createColumnHelper<(typeof treeData)[number]>();
  const [rowSelectionState, setRowSelectionState] = useState<RowSelectionState>({});
  const [selectedRows, setSelectedRows] = useState<DetailedNodeSummary[]>([]);

  useEffect(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  }, []);

  useInterval(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  }, 30000);

  const columns = useMemo(
    () => [
      getRowSelectionColumn(columnHelper, {
        minSize: 40,
        size: 40,
        maxSize: 40,
      }),
      columnHelper.accessor('label', {
        cell: (info) => {
          const { depth, original } = info.row;
          const isExpanding = isNodeExpandingOrCollapsing(original, action);
          return (
            <div
              style={{
                paddingLeft: `${depth * 22}px`,
              }}
              className="flex items-center"
            >
              {info.row.getCanExpand() && isExpanding ? (
                <CircleSpinner size="sm" />
              ) : null}
              {info.row.getCanExpand() && !isExpanding ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      graphDataManagerFunctionsRef.current.isNodeExpanded({
                        nodeId: original.id!,
                        nodeType: original.type!,
                      })
                    ) {
                      graphDataManagerFunctionsRef.current.getDataUpdates({
                        type: 'collapseNode',
                        nodeId: original.id!,
                        nodeType: original.type!,
                      });
                    } else {
                      graphDataManagerFunctionsRef.current.getDataUpdates({
                        type: 'expandNode',
                        nodeId: original.id!,
                        nodeType: original.type!,
                      });
                    }
                  }}
                >
                  {info.row.getIsExpanded() ? <HiMinus /> : <HiPlus />}
                </button>
              ) : null}
              {!info.row.getCanExpand() ? <span>&nbsp;&nbsp;&nbsp;</span> : null}
              {itemHasDetails({
                type: info.row.original.type,
              }) ? (
                <DFLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setClickedItem({
                      nodeId: info.row.original.id!,
                      nodeType: info.row.original.type!,
                    });
                  }}
                  className="flex-1 shrink-0 truncate pl-2"
                >
                  {info.getValue()}
                </DFLink>
              ) : (
                <span className="flex-1 shrink-0 truncate pl-2">{info.getValue()}</span>
              )}
            </div>
          );
        },
        header: () => 'name',
        minSize: 400,
        size: 500,
        maxSize: 1000,
      }),
      columnHelper.accessor((row) => row.type, {
        id: 'type',
        cell: (info) => {
          return info.getValue?.()?.replaceAll('_', ' ');
        },
        header: () => <span>type</span>,
        minSize: 340,
        size: 400,
        maxSize: 500,
        enableSorting: false,
      }),
    ],
    [treeData, action],
  );

  useEffect(() => {
    setExpandedState(() => {
      return getExpandedIdsFromTreeData(treeData).reduce<Record<string, boolean>>(
        (prev, current) => {
          prev[current] = true;
          return prev;
        },
        {},
      );
    });

    setRowSelectionState((prev) => {
      if (!Object.keys(prev).length) return prev;
      return getIdsFromTreeData(treeData).reduce<Record<string, boolean>>(
        (acc, current) => {
          if (prev[current]) {
            acc[current] = true;
          }
          return acc;
        },
        {},
      );
    });
  }, [treeData]);

  useEffect(() => {
    const selectedIds = getIdsFromTreeData(treeData).filter((nodeId) => {
      return !!rowSelectionState[nodeId];
    });
    setSelectedRows(() => {
      return graphDataManagerFunctionsRef.current.getNodesForIds(selectedIds);
    });
  }, [rowSelectionState, treeData]);

  if (isRefreshInProgress && !treeData.length) {
    return <TableSkeleton columns={2} rows={5} size="sm" />;
  }
  return (
    <>
      <StartScanPopover selectedItems={selectedRows}>
        <Button color="primary" size="sm" type="button">
          Actions
        </Button>
      </StartScanPopover>
      <Table
        size="sm"
        data={treeData}
        columns={columns}
        enableSorting
        enableRowSelection
        enableColumnResizing
        rowSelectionState={rowSelectionState}
        onRowSelectionChange={setRowSelectionState}
        expanded={expandedState}
        onExpandedChange={setExpandedState}
        sortingState={sortingState}
        onSortingChange={setSortingState}
        enableSubRowSelection={false}
        getRowId={(row) => {
          return row.id ?? '';
        }}
        getRowCanExpand={(row) => {
          return itemExpands(row.original);
        }}
        getSubRows={(row) => row.children ?? []}
      />
      {clickedItem ? (
        <NodeDetailsStackedModal
          node={clickedItem}
          open={true}
          onOpenChange={(open) => {
            if (!open) setClickedItem(undefined);
          }}
          onStartScanClick={(options) => setScanOptions(options)}
        />
      ) : null}
      <ConfigureScanModal
        open={!!scanOptions}
        onOpenChange={() => setScanOptions(undefined)}
        scanOptions={scanOptions}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      label={status.toUpperCase().replaceAll('_', ' ')}
      className={classNames({
        'bg-green-100 dark:bg-green-600/10 text-green-600 dark:text-green-400':
          status.toLowerCase() === 'complete',
        'bg-red-100 dark:bg-red-600/10 text-red-600 dark:text-red-400':
          status.toLowerCase() === 'error',
        'bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400':
          status.toLowerCase() === 'in_progress',
      })}
      size="sm"
    />
  );
}

function isNodeExpandingOrCollapsing(node: DetailedNodeSummary, action?: TopologyAction) {
  if (
    (action?.type === 'expandNode' || action?.type === 'collapseNode') &&
    action?.nodeId === node.id
  ) {
    return true;
  }
  return false;
}

function useTableDataManager() {
  const [searchParams] = useSearchParams();
  const [treeData, setTreeData] = useState<TopologyTreeData[]>([]);
  const [action, setAction] = useState<TopologyAction>();
  const [storageManager] = useState(new GraphStorageManager());
  const rootNodeType = searchParams.get('type') ?? NodeType.cloud_provider;

  const fetcher = useFetcher<TopologyActionData>();
  const getDataUpdates = (action: TopologyActionData['action']): void => {
    if (fetcher.state !== 'idle') return;
    if (action?.type === 'expandNode')
      storageManager.addNodeToFilters({
        nodeId: action.nodeId,
        nodeType: action.nodeType,
      });
    else if (action?.type === 'collapseNode')
      storageManager.removeNodeFromFilters({
        nodeId: action.nodeId,
        nodeType: action.nodeType,
      });
    fetcher.submit(
      {
        action: JSON.stringify(action),
        filters: JSON.stringify(storageManager.getFilters()),
      },
      {
        method: 'post',
        action: `/data-component/topology?${searchParams.toString()}`,
      },
    );
    setAction(action);
  };
  useEffect(() => {
    if (!fetcher.data) return;
    storageManager.setGraphData(fetcher.data.data);
    setTreeData(storageManager.getTreeData({ rootNodeType: rootNodeType as NodeType }));
    setAction(undefined);
  }, [fetcher.data]);
  return {
    treeData,
    action,
    getDataUpdates,
    isNodeExpanded: storageManager.isNodeExpanded,
    isRefreshInProgress: fetcher.state !== 'idle',
    getNodesForIds: storageManager.getNodesForIds,
  };
}

function StartScanPopover({
  selectedItems,
  children,
}: {
  selectedItems: DetailedNodeSummary[];
  children: React.ReactNode;
}) {
  const [groupedSelectedItems, setGroupedSelectedItems] = useState<
    Record<string, DetailedNodeSummary[]>
  >({});

  useEffect(() => {
    if (selectedItems.length) {
      setGroupedSelectedItems(() => {
        return selectedItems.reduce<typeof groupedSelectedItems>((acc, selectedItem) => {
          if (!acc[selectedItem.type!]) {
            acc[selectedItem.type!] = [];
          }
          acc[selectedItem.type!].push(selectedItem);
          return acc;
        }, {});
      });
    }
  }, [selectedItems]);

  if (!selectedItems.length) {
    return (
      <div className="h-9 my-2 flex items-center text-base text-gray-700 dark:text-gray-400">
        No Rows Selected
      </div>
    );
  }

  return (
    <Popover
      content={
        <div className="px-3 pt-1 pb-3 text-gray-500 dark:text-gray-400">
          {groupedSelectedItems['cloud_provider']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['cloud_provider']?.length ?? 0} Cloud Providers
                selected
              </div>
              <div className="text-sm">No actions available for cloud providers.</div>
            </>
          ) : null}
          {groupedSelectedItems['cloud_region']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['cloud_region']?.length ?? 0} Cloud Regions selected
              </div>
              <div className="text-sm">No actions available for cloud regions.</div>
            </>
          ) : null}
          {groupedSelectedItems['kubernetes_cluster']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['kubernetes_cluster']?.length ?? 0} Kubernetes
                Clusters selected
              </div>
              <div className="text-sm flex gap-2 py-1">
                <Button type="button" color="primary" outline size="xs">
                  Start Vulnerability Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Secret Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Malware Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Compliance Scan
                </Button>
              </div>
            </>
          ) : null}
          {groupedSelectedItems['host']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['host']?.length ?? 0} Hosts selected
              </div>
              <div className="text-sm flex gap-2 py-1">
                <Button type="button" color="primary" outline size="xs">
                  Start Vulnerability Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Secret Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Malware Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Compliance Scan
                </Button>
              </div>
            </>
          ) : null}
          {groupedSelectedItems['container']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['container']?.length ?? 0} Containers selected
              </div>
              <div className="text-sm flex gap-2 py-1">
                <Button type="button" color="primary" outline size="xs">
                  Start Vulnerability Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Secret Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Malware Scan
                </Button>
                <Button type="button" color="primary" outline size="xs">
                  Start Compliance Scan
                </Button>
              </div>
            </>
          ) : null}
          {groupedSelectedItems['pod']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['pod']?.length ?? 0} Pods selected
              </div>
              <div className="text-sm">No actions available for pods.</div>
            </>
          ) : null}
          {groupedSelectedItems['process']?.length ? (
            <>
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-base font-semibold">
                {groupedSelectedItems['process']?.length ?? 0} Processes selected
              </div>
              <div className="text-sm">No actions available for processes.</div>
            </>
          ) : null}
        </div>
      }
      triggerAsChild
    >
      <div className="py-2 inline">{children}</div>
    </Popover>
  );
}
