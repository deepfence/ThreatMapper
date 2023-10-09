import { LoaderFunctionArgs } from 'react-router-dom';
import { useUnmount } from 'react-use';

import { getTopologyApiClient } from '@/api/api';
import { ModelGraphResult } from '@/api/generated';
import { TopologyAction } from '@/features/topology/types/graph';
import { GraphStorageManager, NodeType } from '@/features/topology/utils/topology-data';
import { apiWrapper } from '@/utils/api';

export interface TopologyLoaderData {
  data: ModelGraphResult;
  action?: TopologyAction;
}

export const TopologyViewTypes = [
  NodeType.cloud_provider,
  NodeType.kubernetes_cluster,
  NodeType.host,
  NodeType.pod,
  NodeType.container,
] as const;

// React router revalidate uses the same url with all the params etc to call the loader again
// so if the user has performed some action on the graph/table, react router will send the same
// payload even in case of revalidate, so here we check if we get the same action again, if yes
// we return a refresh action instead of the same action again
class TopologyActionDeduplicator {
  private static previousAction: TopologyLoaderData['action'];

  static getDeduplicatedAction(currentAction: TopologyLoaderData['action']) {
    let action = currentAction;
    if (
      (currentAction?.type === 'expandNode' || currentAction?.type === 'collapseNode') &&
      (this.previousAction?.type === 'expandNode' ||
        this.previousAction?.type === 'collapseNode') &&
      this.previousAction?.type === action?.type &&
      this.previousAction?.nodeId === action?.nodeId &&
      this.previousAction?.nodeType === action?.nodeType
    ) {
      action = { type: 'refresh' };
    }
    this.previousAction = currentAction;
    return action;
  }

  static reset() {
    this.previousAction = undefined;
  }
}
export function useTopologyActionDeduplicator() {
  useUnmount(() => {
    TopologyActionDeduplicator.reset();
  });
}

const loader = async ({ request }: LoaderFunctionArgs): Promise<TopologyLoaderData> => {
  const url = new URL(request.url);
  const currentAction = JSON.parse(
    (url.searchParams.get('action') as string) ?? 'undefined',
  ) as TopologyLoaderData['action'];
  const filters = JSON.parse(url.searchParams.get('filters') as string) as ReturnType<
    GraphStorageManager['getFilters']
  >;
  let type = url.searchParams.get('type') ?? NodeType.cloud_provider;
  const skipConnections = (url.searchParams.get('skipConnections') ?? 'false') === 'true';
  if (!TopologyViewTypes.includes(type as (typeof TopologyViewTypes)[number])) {
    type = NodeType.cloud_provider;
  }

  const action = TopologyActionDeduplicator.getDeduplicatedAction(currentAction);

  const apiFuncMap: Record<
    (typeof TopologyViewTypes)[number],
    ReturnType<typeof getTopologyApiClient>['getCloudTopologyGraph'] | undefined
  > = {
    cloud_provider: getTopologyApiClient().getCloudTopologyGraph,
    host: getTopologyApiClient().getHostsTopologyGraph,
    kubernetes_cluster: getTopologyApiClient().getKubernetesTopologyGraph,
    pod: getTopologyApiClient().getPodsTopologyGraph,
    container: getTopologyApiClient().getContainersTopologyGraph,
  };
  const getGraphDataApi = apiWrapper({
    fn: apiFuncMap[type as (typeof TopologyViewTypes)[number]]!,
  });
  const graphData = await getGraphDataApi({
    graphTopologyFilters: {
      ...filters,
      field_filters: {
        contains_filter: { filter_in: {} },
        match_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
        compare_filter: null,
      },
      skip_connections: skipConnections,
    },
  });

  if (!graphData.ok) {
    throw new Error('unknown response');
  }
  return {
    data: graphData.value,
    action: action,
  };
};

export const module = {
  loader,
};
