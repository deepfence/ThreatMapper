import { useEffect } from 'react';
import { generatePath, useFetcher } from 'react-router-dom';

import { getTopologyApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelScanResultsActionRequestScanTypeEnum,
} from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type ScanType = ModelScanResultsActionRequestScanTypeEnum;

export type ClustersListType = {
  clusterId: string;
  clusterName: string;
};

export const searchClustersApiLoader = async (): Promise<ClustersListType[]> => {
  const result = await makeRequest({
    apiFunction: getTopologyApiClient().getKubernetesTopologyGraph,
    apiArgs: [
      {
        graphTopologyFilters: {
          cloud_filter: [],
          field_filters: {
            contains_filter: { filter_in: null },
            order_filter: null as any,
            match_filter: {
              filter_in: {},
            },
          },
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
          service_filter: null,
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{
        message?: string;
      }>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message,
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (result === null) {
    return [];
  }
  const clusters = Object.keys(result.nodes)
    .map((key) => result.nodes[key])
    .filter((node) => {
      return node.type === 'kubernetes_cluster';
    })
    .sort((a, b) => {
      return (a.label ?? a.id ?? '').localeCompare(b.label ?? b.id ?? '');
    });
  return clusters.map((res) => {
    return {
      clusterId: res.id ?? 'N/A',
      clusterName: res.label ?? 'N/A',
    };
  });
};

export const useGetClustersList = (): {
  status: 'idle' | 'loading' | 'submitting';
  clusters: ClustersListType[];
} => {
  const fetcher = useFetcher<ClustersListType[]>();

  useEffect(() => {
    fetcher.load(generatePath('/data-component/search/clusters'));
  }, []);

  return {
    status: fetcher.state,
    clusters: fetcher.data ?? [],
  };
};
