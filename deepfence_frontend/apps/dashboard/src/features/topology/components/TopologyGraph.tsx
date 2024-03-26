import { useEffect, useMemo, useRef, useState } from 'react';
import { useFetcher, useParams } from 'react-router-dom';
import { useDebounce, useEffectOnce, useHoverDirty, useMeasure } from 'react-use';
import { cn } from 'tailwind-preset';
import { CircleSpinner } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { DetailsLineIcon } from '@/components/icons/common/DetailsLine';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';
import { ResizeDownIcon } from '@/components/icons/common/ResizeDown';
import { ResizeUpIcon } from '@/components/icons/common/ResizeUp';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import {
  TopologyLoaderData,
  useTopologyActionDeduplicator,
} from '@/features/topology/data-components/topologyLoader';
import { useG6Graph } from '@/features/topology/hooks/useG6Graph';
import { G6GraphEvent, G6Node, NodeModel } from '@/features/topology/types/graph';
import {
  focusItem,
  itemExpands,
  itemHasDetails,
  nodeToFront,
} from '@/features/topology/utils/expand-collapse';
import { onNodeHover } from '@/features/topology/utils/graph-styles';
import { updateGraph } from '@/features/topology/utils/graph-update';
import {
  getTopologyDiff,
  GraphStorageManager,
} from '@/features/topology/utils/topology-data';
import { useTheme } from '@/theme/ThemeContext';

const MAX_NODES_COUNT_THRESHOLD = 200;

interface TooltipState {
  x: number;
  y: number;
  show: boolean;
  item: G6Node | null;
}

export const TopologyGraph = () => {
  // measures parent of the graph, so we can set the graph width and height
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
  const { mode } = useTheme();

  // tooltip related hooks
  const [tooltipLoc, setTooltipLoc] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    item: null,
  });
  const [debouncedTooltipLoc, setDebouncedTooltipLoc] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    item: null,
  });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const isHoveringTooltip = useHoverDirty(tooltipRef);
  useDebounce(
    () => {
      if (!isHoveringTooltip) {
        setDebouncedTooltipLoc({ ...tooltipLoc });
      }
    },
    300,
    [isHoveringTooltip, tooltipLoc],
  );

  // for sidepanel to know which item we need to show details for
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
    parentId?: string;
  }>();

  // g6 hooks
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { graph } = useG6Graph(container, {}, {});

  // graph data management hooks
  const {
    dataDiffWithAction,
    isRefreshInProgress,
    nodeCountLimitExceeded,
    ...graphDataManagerFunctions
  } = useGraphDataManager();
  const graphDataManagerFunctionsRef = useRef(graphDataManagerFunctions);
  graphDataManagerFunctionsRef.current = graphDataManagerFunctions;
  useEffectOnce(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  });
  useEffect(() => {
    if (dataDiffWithAction.diff && dataDiffWithAction.action) {
      updateGraph(mode, graph!, dataDiffWithAction.diff, dataDiffWithAction.action);
      if (dataDiffWithAction.action.type === 'expandNode') {
        nodeToFront(graph!, dataDiffWithAction.action.nodeId);
        focusItem(graph!, dataDiffWithAction.action.nodeId);
      }
    }
  }, [dataDiffWithAction]);

  // change graph size if parent size changes
  useEffect(() => {
    if (graph !== null && width && height) {
      graph.changeSize(width, height);
    }
  }, [width, height]);

  // set up graph events
  useEffect(() => {
    if (!graph) return;
    graph.on('node:click', (e: G6GraphEvent) => {
      e.preventDefault();
    });
    graph.on('node:contextmenu', (e) => {
      e.preventDefault();
    });
    graph.on('node:mouseenter', (e: G6GraphEvent) => {
      onNodeHover(e.item as G6Node, true);
      if (e.item) {
        // https://github.com/antvis/G6/blob/master/packages/plugin/src/tooltip/index.ts
        // TODO: this can be much improved, see above file.
        const width: number = graph.get('width');
        const height: number = graph.get('height');

        // how far you want to tooltip to open from cursor
        const offsetX = 10;
        const offsetY = 10;

        const point = graph.getPointByClient(e.clientX, e.clientY);

        const { x, y } = graph.getCanvasByPoint(point.x, point.y);

        const graphContainer = graph.getContainer();

        const res = {
          x: x + graphContainer.offsetLeft + offsetX,
          y: y + graphContainer.offsetTop + offsetY,
        };

        const tooltipBBox = {
          width: 200,
          height: 120,
        };

        if (x + tooltipBBox.width + offsetX > width) {
          res.x -= tooltipBBox.width + offsetX;
        }

        if (y + tooltipBBox.height + offsetY > height) {
          res.y -= tooltipBBox.height + offsetY;
          if (res.y < 0) {
            res.y = 0;
          }
        }
        setDebouncedTooltipLoc((prev) => ({ ...prev, show: false }));
        setTooltipLoc({
          show: true,
          x: res.x,
          y: res.y,
          item: e.item as G6Node,
        });
      }
    });
    graph.on('node:mouseleave', (e: G6GraphEvent) => {
      onNodeHover(e.item as G6Node, false);
      setTooltipLoc((prev) => {
        return { ...prev, show: false };
      });
    });
    graph.on('node:dragstart', (e: G6GraphEvent) => {
      e.preventDefault();
      setDebouncedTooltipLoc((prev) => {
        return { ...prev, show: false };
      });
    });
    graph.on('node:dragend', (e: G6GraphEvent) => {
      e.preventDefault();
      graph.emit('node:mouseenter', e);
    });

    graph.on('combo:drag', (e: G6GraphEvent) => {
      e.preventDefault();
    });
    graph.on('combo:click', (e: G6GraphEvent) => {
      e.item && graph?.focusItem(e.item, true);
    });
  }, [graph]);

  return (
    <>
      <div
        className="h-full w-full relative select-none overflow-hidden"
        ref={measureRef}
        style={{
          background:
            mode === 'dark'
              ? `radial-gradient(48.55% 48.55% at 50.04% 51.45%, #16253B 0%, #0B121E 100%)`
              : 'radial-gradient(70.29% 70.29% at 50.04% 50%, #F3F4F6 48.77%, #CDD4E0 96.42%)',
        }}
      >
        {/** had to use this absolute relative trick, otherwise element does not shrink, only grows */}
        <div className="absolute inset-0" ref={setContainer} />
        <div
          className="absolute"
          style={{
            top: tooltipLoc.y,
            left: tooltipLoc.x,
            display: !debouncedTooltipLoc.show ? 'none' : 'block',
          }}
          ref={tooltipRef}
        >
          <GraphTooltip
            visible={debouncedTooltipLoc.show}
            item={debouncedTooltipLoc.item}
            isNodeExpanded={graphDataManagerFunctions.isNodeExpanded}
            onExpandCollapseClick={(model) => {
              setDebouncedTooltipLoc((prev) => {
                return { ...prev, show: false };
              });
              if (!model.df_data?.type) return;
              if (
                !graphDataManagerFunctionsRef.current.isNodeExpanded({
                  nodeId: model.id,
                  nodeType: model.df_data.type,
                })
              ) {
                graphDataManagerFunctionsRef.current.getDataUpdates({
                  type: 'expandNode',
                  nodeId: model.id,
                  nodeType: model.df_data.type,
                });
              } else {
                graphDataManagerFunctionsRef.current.getDataUpdates({
                  type: 'collapseNode',
                  nodeId: model.id,
                  nodeType: model.df_data.type,
                });
              }
            }}
            onViewDetailsClick={(model) => {
              setDebouncedTooltipLoc((prev) => {
                return { ...prev, show: false };
              });
              if (!model?.df_data?.type || !model?.df_data?.id) return;
              setClickedItem({
                nodeId: model.df_data.id,
                nodeType: model.df_data.type,
                parentId: model.df_data.immediate_parent_id,
              });
            }}
          />
        </div>

        {isRefreshInProgress ? (
          <div className="absolute bottom-32 left-6 text-gray-600 dark:text-gray-400">
            <CircleSpinner size="sm" />
          </div>
        ) : null}
        {!isRefreshInProgress &&
        graphDataManagerFunctions.isEmpty() &&
        !nodeCountLimitExceeded ? (
          <div className="absolute inset-0">
            <NoData />
          </div>
        ) : null}
        {!isRefreshInProgress && nodeCountLimitExceeded ? (
          <div className="absolute inset-0">
            <NodeLimitExceeded />
          </div>
        ) : null}
      </div>
      {clickedItem ? (
        <NodeDetailsStackedModal
          node={clickedItem}
          open={true}
          onOpenChange={(open) => {
            if (!open) setClickedItem(undefined);
          }}
        />
      ) : null}
    </>
  );
};

const GraphTooltip = ({
  item,
  onExpandCollapseClick,
  onViewDetailsClick,
  isNodeExpanded,
  visible,
}: {
  item: G6Node | null;
  onExpandCollapseClick: (model: NodeModel) => void;
  onViewDetailsClick: (model: NodeModel) => void;
  isNodeExpanded: ({ nodeId, nodeType }: { nodeId: string; nodeType: string }) => boolean;
  visible: boolean;
}) => {
  const model = item?.getModel() as NodeModel | undefined;
  if (!model) return null;
  const expands = itemExpands(model.df_data);
  const hasDetails = itemHasDetails(model.df_data);

  const expanded = useMemo(() => {
    if (model.df_data?.id && model.df_data.type) {
      return isNodeExpanded({ nodeId: model.df_data.id, nodeType: model.df_data.type });
    }
    return false;
  }, [model.df_data, isNodeExpanded, visible]);

  return (
    <div
      role="tooltip"
      className={cn(
        'inline-block rounded-[5px] dark:bg-[#C1CFD9] bg-[#f8f8f8] dark:shadow-none shadow-[0_0_6px_2px_rgba(34,34,34,0.20)] w-[200px] select-text',
        'pt-1.5 pb-1.5 px-2.5 dark:text-text-text-inverse text-text-input-value',
      )}
    >
      <div className="text-p3 capitalize">
        {(model.df_data?.type ?? 'Unknown').replaceAll('_', ' ')}
      </div>
      <div className="mt-[3px] text-[13px] leading-[18px]">
        {model.df_data?.label ?? '-'}
      </div>
      {expands || hasDetails ? (
        <>
          <div className="h-[1px] mt-2 mb-2 dark:bg-df-gray-500 bg-df-gray-200 -mx-2.5" />
          {expands && (
            <div className="-mx-2.5">
              <button
                onClick={() => {
                  onExpandCollapseClick(model);
                }}
                className="px-2.5 text-p6 py-1 dark:hover:bg-text-text-and-icon hover:bg-bg-breadcrumb-bar flex items-center gap-2 w-full"
              >
                <div className="h-4 w-4 shrink-0">
                  {expanded ? <ResizeDownIcon /> : <ResizeUpIcon />}
                </div>
                <div>{expanded ? 'Collapse' : 'Expand'}</div>
              </button>
            </div>
          )}
          {hasDetails && (
            <div className="-mx-2.5">
              <button
                onClick={() => {
                  onViewDetailsClick(model);
                }}
                className="px-2.5 text-p6 py-1 dark:hover:bg-text-text-and-icon hover:bg-bg-breadcrumb-bar flex items-center gap-2 w-full"
              >
                <div className="h-4 w-4 shrink-0">
                  <DetailsLineIcon />
                </div>
                <div>View details</div>
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

const NoData = () => {
  return (
    <div className="h-full flex gap-2 flex-col items-center justify-center p-6">
      <div className="w-8 h-8 text-status-info">
        <ErrorStandardSolidIcon />
      </div>
      <div className="text-text-text-and-icon text-lg text-center">
        No data to display, please{' '}
        <DFLink to="/settings/connection-instructions">
          connect your infrastructure
        </DFLink>{' '}
        to the platform to visualize it.
      </div>
    </div>
  );
};

const NodeLimitExceeded = () => {
  const params = useParams();
  const type = params.viewType ?? 'cloud_provider';
  return (
    <div className="h-full flex gap-2 flex-col items-center justify-center p-6 dark:bg-bg-hover-2 bg-bg-breadcrumb-bar opacity-50">
      <div className="w-8 h-8 text-status-info">
        <ErrorStandardSolidIcon />
      </div>
      <div className="text-text-text-and-icon text-lg text-center">
        There are too many nodes to display on the Graph view. Please use the{' '}
        <DFLink to={`/topology/table/${type}`}>Table view</DFLink> to see all nodes..
      </div>
    </div>
  );
};

function useGraphDataManager() {
  const params = useParams();
  const type = params.viewType ?? 'cloud_provider';
  const [dataDiffWithAction, setDataDiffWithAction] = useState<{
    diff?: ReturnType<typeof getTopologyDiff>;
    action?: TopologyLoaderData['action'];
  }>({});
  const [nodeCountLimitExceeded, setNodeCountLimitExceeded] = useState(false);
  useTopologyActionDeduplicator();
  const [storageManager] = useState(new GraphStorageManager());

  const fetcher = useFetcher<TopologyLoaderData>();
  const getDataUpdates = (action: TopologyLoaderData['action']): void => {
    if (fetcher.state !== 'idle') return;
    if (action?.type === 'expandNode') {
      storageManager.addNodeToFilters({
        nodeId: action.nodeId,
        nodeType: action.nodeType,
      });
    } else if (action?.type === 'collapseNode') {
      storageManager.removeNodeFromFilters({
        nodeId: action.nodeId,
        nodeType: action.nodeType,
      });
    }
    const searchParams = new URLSearchParams();
    searchParams.set('type', type);
    searchParams.set('action', JSON.stringify(action));
    searchParams.set('filters', JSON.stringify(storageManager.getFilters()));
    fetcher.load(`/data-component/topology?${searchParams.toString()}`);
  };

  useEffect(() => {
    if (!fetcher.data) return;
    const action = fetcher.data.action;
    if (
      GraphStorageManager.getTotalNodesCount(fetcher.data.data) <
      MAX_NODES_COUNT_THRESHOLD
    ) {
      storageManager.setGraphData(fetcher.data.data);
      const diff = storageManager.getDiff();
      setDataDiffWithAction({ action, diff });
      setNodeCountLimitExceeded(false);
    } else {
      setNodeCountLimitExceeded(true);
    }
  }, [fetcher.data]);

  return {
    dataDiffWithAction,
    getDataUpdates,
    isNodeExpanded: storageManager.isNodeExpanded,
    isEmpty: storageManager.isEmpty,
    isRefreshInProgress: fetcher.state !== 'idle',
    nodeCountLimitExceeded,
  };
}
