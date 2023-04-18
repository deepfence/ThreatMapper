import { ActionFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type ClustersListType = {
  clusterId: string;
  clusterName: string;
};

export const searchClustersApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ClustersListType[]> => {
  const searchParams = new URL(request.url).searchParams;
  const scanType = searchParams?.get('scanType')?.toString();
  if (!scanType) {
    throw new Error('Scan For is required');
  }
  const searchText = searchParams?.get('searchText')?.toString();
  const offset = searchParams?.get('offset')?.toString() ?? '0';

  const matchFilter = { filter_in: {} };
  if (searchText?.length) {
    matchFilter.filter_in = {
      node_name: [searchText],
    };
  }

  const result = await makeRequest({
    apiFunction: getSearchApiClient().searchKubernetesClusters,
    apiArgs: [
      {
        searchSearchNodeReq: {
          node_filter: {
            filters: {
              compare_filter: null,
              contains_filter: {
                filter_in: null,
              },
              match_filter: matchFilter,

              order_filter: {
                order_fields: null,
              },
            },
            in_field_filter: null,
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: {
            offset: +offset,
            size: 15,
          },
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
  return result.map((res) => {
    return {
      clusterId: res.node_id,
      clusterName: res.node_name,
    };
  });
};

type LoadArgs = {
  searchText?: string;
  offset?: number;
};

export const useGetClustersList = (): {
  status: 'idle' | 'loading' | 'submitting';
  clusters: ClustersListType[];
  load: (_: LoadArgs) => void;
} => {
  const fetcher = useFetcher<ClustersListType[]>();

  return {
    status: fetcher.state,
    clusters: fetcher.data ?? [],
    load: ({ searchText, offset = 0 }: LoadArgs) => {
      const searchParams = new URLSearchParams();
      searchParams.set('searchText', searchText ?? '');
      searchParams.set('offset', offset.toString());

      fetcher.submit(null, {
        method: 'post',
        action: `/data-component/search/clusters/?${searchParams.toString()}`,
      });
    },
  };
};
