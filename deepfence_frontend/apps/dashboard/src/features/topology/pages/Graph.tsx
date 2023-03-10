// WARNING: This component is supposed to render only once at a time.
import { debounce } from 'lodash-es';
import { useEffect, useState } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { useMeasure } from 'react-use';

import { getTopologyApiClient } from '@/api/api';
import { ApiDocsGraphResult } from '@/api/generated';
import { useG6raph } from '@/features/topology/hooks/useG6Graph';
import { useTopology } from '@/features/topology/hooks/useTopology';
import { getTopologyDiff } from '@/features/topology/utils/topologyData';
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
        type: 'expandNode';
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
  const graphData = await makeRequest({
    apiFunction: getTopologyApiClient().getCloudTopologyGraph,
    apiArgs: [
      {
        graphTopologyFilters: {
          cloud_filter: [],
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
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
  const { dataDiffWithAction, getDataUpdates } = useGraphDataManager();
  const { update } = useTopology(graph, {
    tick: debounce(() => {
      //todo
    }, 500),
  });

  useEffect(() => {
    getDataUpdates({ type: 'refresh' });
  }, []);

  useEffect(() => {
    if (update && dataDiffWithAction.diff) update(dataDiffWithAction.diff);
  }, [dataDiffWithAction]);

  useEffect(() => {
    // update the graph size when the container element is resized by smaller height
    if (graph !== null && width && height) {
      // browser resize won't impact graph layout
      graph.changeSize(width, height);
    }
  }, [width, height]);

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
  const [previousData, setPreviousData] = useState<ActionData['data']>();

  const fetcher = useFetcher<ActionData>();
  const getDataUpdates = (action: ActionData['action']): void => {
    if (fetcher.state !== 'idle') return;
    fetcher.submit({ action: JSON.stringify(action) }, { method: 'post' });
  };
  useEffect(() => {
    if (!fetcher.data) return;
    const action = fetcher.data.action;
    const diff = getTopologyDiff(fetcher.data.data, previousData);
    setDataDiffWithAction({ action, diff });
    setPreviousData(fetcher.data.data);
  }, [fetcher.data]);
  return { dataDiffWithAction, getDataUpdates };
}

export const module = {
  action,
  element: <Graph />,
};
