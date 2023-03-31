import { ActionFunctionArgs } from 'react-router-dom';

import { getTopologyApiClient } from '@/api/api';
import { ApiDocsGraphResult } from '@/api/generated';
import { TopologyAction } from '@/features/topology/types/graph';
import { GraphStorageManager, NodeType } from '@/features/topology/utils/topology-data';
import { ApiError, makeRequest } from '@/utils/api';

export interface TopologyActionData {
  data: ApiDocsGraphResult;
  action?: TopologyAction;
}

export const TopologyViewTypes = [
  NodeType.cloud_provider,
  NodeType.kubernetes_cluster,
  NodeType.host,
  NodeType.pod,
  NodeType.container,
] as const;

const action = async ({ request }: ActionFunctionArgs): Promise<TopologyActionData> => {
  const formData = await request.formData();
  const action = JSON.parse(
    (formData.get('action') as string) ?? 'undefined',
  ) as TopologyActionData['action'];
  const filters = JSON.parse(formData.get('filters') as string) as ReturnType<
    GraphStorageManager['getFilters']
  >;
  const url = new URL(request.url);
  let type = url.searchParams.get('type') ?? NodeType.cloud_provider;
  if (!TopologyViewTypes.includes(type as (typeof TopologyViewTypes)[number])) {
    type = NodeType.cloud_provider;
  }

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
  const graphData = await makeRequest({
    apiFunction: apiFuncMap[type as (typeof TopologyViewTypes)[number]]!,
    apiArgs: [
      {
        graphTopologyFilters: {
          ...filters,
          field_filters: {
            contains_filter: { filter_in: {} },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
            compare_filter: null,
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

export const module = {
  action,
};
