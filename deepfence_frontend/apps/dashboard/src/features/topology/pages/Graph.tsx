// WARNING: This component is supposed to render only once at a time.
import { debounce } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { useMeasure } from 'react-use';

import { getTopologyApiClient } from '@/api/api';
import { ApiDocsGraphResult } from '@/api/generated';
import { useG6raph } from '@/features/topology/hooks/useG6Graph';
import { useTopology } from '@/features/topology/hooks/useTopology';
import { G6GraphEvent } from '@/features/topology/types/graph';
import { expandNode } from '@/features/topology/utils/expand-collapse';
import {
  getTopologyDiff,
  GraphStorageManager,
} from '@/features/topology/utils/topologyData';
import { ApiError, makeRequest } from '@/utils/api';

interface ActionData {
  data: ApiDocsGraphResult;
  action?:
    | {
        type: 'expandNode';
        nodeId: string;
        nodeType: string;
      }
    | {
        type: 'collapseNode';
        nodeId: string;
        nodeType: string;
      }
    | {
        type: 'refresh';
      };
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
  const { dataDiffWithAction, ...graphDataManagerFunctions } = useGraphDataManager();
  const graphDataManagerFunctionsRef = useRef(graphDataManagerFunctions);
  const { update } = useTopology(graph, {
    tick: debounce(() => {
      //todo
    }, 500),
  });

  graphDataManagerFunctionsRef.current = graphDataManagerFunctions;

  useEffect(() => {
    graphDataManagerFunctionsRef.current.getDataUpdates({ type: 'refresh' });
  }, []);

  useEffect(() => {
    if (update && dataDiffWithAction.diff) {
      update(dataDiffWithAction.diff);
    }
    // todo add focus code
  }, [dataDiffWithAction]);

  useEffect(() => {
    // update the graph size when the container element is resized by smaller height
    if (graph !== null && width && height) {
      // browser resize won't impact graph layout
      graph.changeSize(width, height);
    }
  }, [width, height]);

  useEffect(() => {
    if (!graph) return;
    graph.on('node:click', (e: G6GraphEvent) => {
      const { item: node } = e;
      const model = node?.get('model');

      if (
        !graphDataManagerFunctionsRef.current.isNodeExpanded({
          nodeId: model.id,
          nodeType: model.type,
        })
      ) {
        expandNode(node!);
        graphDataManagerFunctionsRef.current.getDataUpdates({
          type: 'expandNode',
          nodeId: model.id,
          nodeType: model.type,
        });
      } else {
        graphDataManagerFunctionsRef.current.getDataUpdates({
          type: 'collapseNode',
          nodeId: model.id,
          nodeType: model.type,
        });
      }
    });
  }, [graph]);

  return (
    <div className="h-full w-full relative select-none" ref={measureRef}>
      {/** had to use this absolute relative trick, otherwise element does not shrink, only grows */}
      <div className="absolute inset-0" ref={setContainer} />
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
  console.log('fetcher state is ', fetcher.state);
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
  };
}

export const module = {
  action,
  element: <Graph />,
};
