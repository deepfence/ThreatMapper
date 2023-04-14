import { useEffect, useRef, useState } from 'react';
import { IconContext } from 'react-icons';
import { HiArrowsExpand, HiInformationCircle } from 'react-icons/hi';
import { useFetcher, useSearchParams } from 'react-router-dom';
import { useInterval, useMeasure } from 'react-use';
import { CircleSpinner, Dropdown, DropdownItem } from 'ui-components';

import {
  ConfigureScanModal,
  ConfigureScanModalProps,
} from '@/components/ConfigureScanModal';
import { NodeDetailsStackedModal } from '@/features/topology/components/NodeDetailsStackedModal';
import { TopologyActionData } from '@/features/topology/data-components/topologyAction';
import { useG6raph } from '@/features/topology/hooks/useG6Graph';
import { G6GraphEvent, G6Node, NodeModel } from '@/features/topology/types/graph';
import {
  focusItem,
  itemExpands,
  itemHasDetails,
  nodeToFront,
  showContextMenu,
} from '@/features/topology/utils/expand-collapse';
import { onNodeHover } from '@/features/topology/utils/graph-styles';
import { updateGraph } from '@/features/topology/utils/graph-update';
import {
  getTopologyDiff,
  GraphStorageManager,
} from '@/features/topology/utils/topology-data';

export const TopologyGraph = () => {
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
  const [clickedItem, setClickedItem] = useState<{
    nodeId: string;
    nodeType: string;
  }>();
  const [contextmenu, setContextmenu] = useState<{
    open: boolean;
    x: number;
    y: number;
    model?: NodeModel;
  }>({ open: false, x: 0, y: 0 });
  const [scanOptions, setScanOptions] =
    useState<ConfigureScanModalProps['scanOptions']>();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { graph } = useG6raph(container, {}, {});
  const { dataDiffWithAction, isRefreshInProgress, ...graphDataManagerFunctions } =
    useGraphDataManager();
  const graphDataManagerFunctionsRef = useRef(graphDataManagerFunctions);

  graphDataManagerFunctionsRef.current = graphDataManagerFunctions;

  useEffect(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  }, []);

  useInterval(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  }, 30000);

  useEffect(() => {
    if (dataDiffWithAction.diff && dataDiffWithAction.action) {
      updateGraph(graph!, dataDiffWithAction.diff, dataDiffWithAction.action);
      if (dataDiffWithAction.action.type === 'expandNode') {
        nodeToFront(graph!, dataDiffWithAction.action.nodeId);
        focusItem(graph!, dataDiffWithAction.action.nodeId);
      }
    }
  }, [dataDiffWithAction]);

  useEffect(() => {
    if (graph !== null && width && height) {
      graph.changeSize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (!graph) return;
    graph.on('node:click', (e: G6GraphEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const { item: node } = e;
      const model = node?.getModel() as NodeModel;
      if (!model?.df_data?.type) return;
      if (!showContextMenu(model.df_data)) return;

      setContextmenu({ open: true, x: e.canvasX, y: e.canvasY, model });
    });
    graph.on('node:contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const { item: node } = e;
      const model = node?.getModel() as NodeModel;
      if (!model?.df_data?.type) return;
      if (!showContextMenu(model.df_data)) return;

      setContextmenu({ open: true, x: e.canvasX, y: e.canvasY, model });
    });
    graph.on('node:mouseenter', (e: G6GraphEvent) => {
      onNodeHover(e.item as G6Node, true);
    });
    graph.on('node:mouseleave', (e: G6GraphEvent) => {
      onNodeHover(e.item as G6Node, false);
    });
    graph.on('node:drag', (e: G6GraphEvent) => {
      e.preventDefault();
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
      <div className="h-full w-full relative select-none" ref={measureRef}>
        {/** had to use this absolute relative trick, otherwise element does not shrink, only grows */}
        <div className="absolute inset-0" ref={setContainer} />
        {isRefreshInProgress ? (
          <div className="absolute bottom-32 left-6 text-gray-600 dark:text-gray-400">
            <CircleSpinner size="xl" />
          </div>
        ) : null}
        {
          <Dropdown
            open={contextmenu.open}
            onOpenChange={(open) => {
              setContextmenu((prev) => {
                return {
                  ...prev,
                  open,
                };
              });
            }}
            content={
              <>
                {!!contextmenu.model?.df_data?.type &&
                  itemExpands(contextmenu.model.df_data) && (
                    <DropdownItem
                      onClick={() => {
                        const model = contextmenu.model;
                        if (!model) return;
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
                    >
                      <IconContext.Provider value={{ size: '18px' }}>
                        <HiArrowsExpand />
                      </IconContext.Provider>
                      <span>Expand/Collapse</span>
                    </DropdownItem>
                  )}
                {!!contextmenu.model?.df_data?.type &&
                  itemHasDetails(contextmenu.model.df_data) && (
                    <DropdownItem
                      onClick={() => {
                        const model = contextmenu.model;
                        if (!model) return;
                        if (!model?.df_data?.type || !model?.df_data?.id) return;
                        setClickedItem({
                          nodeId: model.df_data.id,
                          nodeType: model.df_data.type,
                        });
                      }}
                    >
                      <IconContext.Provider value={{ size: '18px' }}>
                        <HiInformationCircle />
                      </IconContext.Provider>
                      <span>Details</span>
                    </DropdownItem>
                  )}
              </>
            }
            triggerAsChild
          >
            {
              <div
                style={{
                  height: 0,
                  width: 0,
                  opacity: 0,
                  position: 'absolute',
                  left: contextmenu.x,
                  top: contextmenu.y,
                }}
              ></div>
            }
          </Dropdown>
        }
      </div>
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
};

function useGraphDataManager() {
  const [searchParams] = useSearchParams();
  const [dataDiffWithAction, setDataDiffWithAction] = useState<{
    diff?: ReturnType<typeof getTopologyDiff>;
    action?: TopologyActionData['action'];
  }>({});
  const [storageManager] = useState(new GraphStorageManager());

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
  };
  useEffect(() => {
    if (!fetcher.data) return;
    const action = fetcher.data.action;
    storageManager.setGraphData(fetcher.data.data);
    const diff = storageManager.getDiff();
    setDataDiffWithAction({ action, diff });
  }, [fetcher.data]);
  return {
    dataDiffWithAction,
    getDataUpdates,
    isNodeExpanded: storageManager.isNodeExpanded,
    isRefreshInProgress: fetcher.state !== 'idle',
  };
}
