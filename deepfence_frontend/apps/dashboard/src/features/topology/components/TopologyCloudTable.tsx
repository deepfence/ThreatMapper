import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher, useParams } from 'react-router-dom';
import { useEffectOnce } from 'react-use';
import {
  CircleSpinner,
  createColumnHelper,
  ExpandedState,
  SortingState,
  Table,
  TableSkeleton,
} from 'ui-components';

import { DetailedNodeSummary } from '@/api/generated';
import { DFLink } from '@/components/DFLink';
import { MinusCircleLineIcon } from '@/components/icons/common/MinusCircleLine';
import { PlusCircleLineIcon } from '@/components/icons/common/PlusCircleLine';
import { TruncatedText } from '@/components/TruncatedText';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import {
  TopologyLoaderData,
  useTopologyActionDeduplicator,
} from '@/features/topology/data-components/topologyLoader';
import { TopologyAction } from '@/features/topology/types/graph';
import { TopologyTreeData } from '@/features/topology/types/table';
import { itemExpands, itemHasDetails } from '@/features/topology/utils/expand-collapse';
import {
  getExpandedIdsFromTreeData,
  GraphStorageManager,
  NodeType,
} from '@/features/topology/utils/topology-data';

export function TopologyCloudTable() {
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
    parentId?: string;
  }>();

  const columnHelper = createColumnHelper<(typeof treeData)[number]>();

  useEffectOnce(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  });

  const columns = useMemo(
    () => [
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
                  <div className="w-4 h-4 shrink-0">
                    {info.row.getIsExpanded() ? (
                      <MinusCircleLineIcon />
                    ) : (
                      <PlusCircleLineIcon />
                    )}
                  </div>
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
                      parentId: info.row.original.immediate_parent_id,
                    });
                  }}
                  className="flex-1 shrink-0 truncate pl-2"
                >
                  <TruncatedText text={info.getValue() ?? ''} />
                </DFLink>
              ) : (
                <span className="flex-1 shrink-0 truncate pl-2">{info.getValue()}</span>
              )}
            </div>
          );
        },
        header: () => 'Name',
        minSize: 400,
        size: 500,
        maxSize: 1000,
      }),
      columnHelper.accessor((row) => row.type, {
        id: 'type',
        cell: (info) => {
          return info.getValue?.()?.replaceAll('_', ' ');
        },
        header: () => 'Type',
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
  }, [treeData]);

  if (isRefreshInProgress && !treeData.length) {
    return (
      <div className="p-4">
        <TableSkeleton columns={2} rows={5} size="default" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Table
        size="default"
        data={treeData}
        columns={columns}
        enableSorting
        enableColumnResizing
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
        />
      ) : null}
    </div>
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
  const params = useParams();
  const [treeData, setTreeData] = useState<TopologyTreeData[]>([]);
  const [action, setAction] = useState<TopologyAction>();
  const [storageManager] = useState(new GraphStorageManager());
  useTopologyActionDeduplicator();
  const rootNodeType = params.viewType || NodeType.cloud_provider;

  const fetcher = useFetcher<TopologyLoaderData>();
  const getDataUpdates = (action: TopologyLoaderData['action']): void => {
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
    const searchParams = new URLSearchParams();
    searchParams.set('action', JSON.stringify(action));
    searchParams.set('skipConnections', 'true');
    searchParams.set('filters', JSON.stringify(storageManager.getFilters()));
    fetcher.load(`/data-component/topology?${searchParams.toString()}`);
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
