import { useEffect, useRef, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { useInterval, useMeasure } from 'react-use';
import { CircleSpinner } from 'ui-components';

import { getTopologyApiClient } from '@/api/api';
import { ApiDocsGraphResult } from '@/api/generated';
import { useG6raph } from '@/features/topology/hooks/useG6Graph';
import {
  G6GraphEvent,
  G6Node,
  GraphAction,
  NodeModel,
} from '@/features/topology/types/graph';
import {
  focusItem,
  itemExpands,
  nodeToFront,
} from '@/features/topology/utils/expand-collapse';
import { onNodeHover } from '@/features/topology/utils/graph-styles';
import { updateGraph } from '@/features/topology/utils/graph-update';
import {
  getTopologyDiff,
  GraphStorageManager,
} from '@/features/topology/utils/topology-data';
import { ApiError, makeRequest } from '@/utils/api';

interface ActionData {
  data: ApiDocsGraphResult;
  action?: GraphAction;
}

const action = async ({ request }: ActionFunctionArgs): Promise<ActionData> => {
  const formData = await request.formData();
  const action = JSON.parse(
    (formData.get('action') as string) ?? 'undefined',
  ) as ActionData['action'];
  const filters = JSON.parse(formData.get('filters') as string) as ReturnType<
    GraphStorageManager['getFilters']
  >;
  const graphData = await makeRequest({
    apiFunction: getTopologyApiClient().getCloudTopologyGraph,
    apiArgs: [
      {
        graphTopologyFilters: {
          ...filters,
          field_filters: {
            contains_filter: { filter_in: {} },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
          },
        },
      },
    ],
  });

  if (ApiError.isApiError(graphData)) {
    throw new Error('unknown response');
  }
  return {
    data: graphData,
    action: action,
  };
};

const Graph = () => {
  const [measureRef, { height, width }] = useMeasure<HTMLDivElement>();
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
      const { item: node } = e;
      const model = node?.getModel() as NodeModel;
      if (!itemExpands(node)) return;
      if (!model?.df_data?.type) return; // does not do anything, helps with typescript errors

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
    <div className="h-full w-full relative select-none" ref={measureRef}>
      {/** had to use this absolute relative trick, otherwise element does not shrink, only grows */}
      <div className="absolute inset-0" ref={setContainer} />
      {isRefreshInProgress ? (
        <div className="absolute bottom-32 left-6 text-gray-600 dark:text-gray-400">
          <CircleSpinner size="xl" />
        </div>
      ) : null}
    </div>
  );
};

function useGraphDataManager() {
  const [dataDiffWithAction, setDataDiffWithAction] = useState<{
    diff?: ReturnType<typeof getTopologyDiff>;
    action?: ActionData['action'];
  }>({});
  const [storageManager] = useState(new GraphStorageManager());

  const fetcher = useFetcher<ActionData>();
  const getDataUpdates = (action: ActionData['action']): void => {
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
      { method: 'post' },
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

export const module = {
  action,
  element: <Graph />,
};
