import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getTopologyApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type ClustersListType = {
  clusterId: string;
  clusterName: string;
};

export const searchClustersApiLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<ClustersListType[]> => {
  const searchParams = new URL(request.url).searchParams;
  const searchText = searchParams?.get('searchText')?.toString();

  const matchFilter = { filter_in: {} };
  if (searchText?.length) {
    matchFilter.filter_in = {
      node_id: [searchText],
    };
  }

  const result = await makeRequest({
    apiFunction: getTopologyApiClient().getKubernetesTopologyGraph,
    apiArgs: [
      {
        graphTopologyFilters: {
          cloud_filter: [],
          field_filters: {
            contains_filter: { filter_in: null },
            order_filter: null as any,
            match_filter: matchFilter,
            compare_filter: null,
          },
          host_filter: [],
          kubernetes_filter: [],
          pod_filter: [],
          region_filter: [],
          container_filter: [],
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

export const useGetClustersList = ({
  searchText,
}: {
  searchText?: string;
}): {
  status: 'idle' | 'loading' | 'submitting';
  clusters: ClustersListType[];
} => {
  const fetcher = useFetcher<ClustersListType[]>();

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('searchText', searchText ?? '');

    fetcher.load(
      generatePath(`/data-component/search/clusters/?${searchParams.toString()}`),
    );
  }, [searchText]);

  return {
    status: fetcher.state,
    clusters: fetcher.data ?? [],
  };
};
