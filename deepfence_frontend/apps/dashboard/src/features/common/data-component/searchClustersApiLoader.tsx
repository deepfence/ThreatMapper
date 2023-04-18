import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type SearchClustersLoaderDataType = {
  clusters: {
    clusterId: string;
    clusterName: string;
  }[];
  hasNext: boolean;
};

export const searchClustersApiLoader = async ({
  request,
}: LoaderFunctionArgs): Promise<SearchClustersLoaderDataType> => {
  const searchParams = new URL(request.url).searchParams;

  const searchText = searchParams?.get('searchText')?.toString();
  const size = parseInt(searchParams?.get('size')?.toString() ?? '0', 10);

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
            offset: 0,
            size: size + 1,
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
    return {
      clusters: [],
      hasNext: false,
    };
  }

  return {
    clusters: result.slice(0, size).map((res) => {
      return {
        clusterId: res.node_id,
        clusterName: res.node_name,
      };
    }),
    hasNext: result.length > size,
  };
};

export const useGetClustersList = ({
  searchText,
  size,
}: {
  searchText?: string;
  size: number;
}): {
  status: 'idle' | 'loading' | 'submitting';
  clusters: SearchClustersLoaderDataType['clusters'];
  hasNext: boolean;
} => {
  const fetcher = useFetcher<SearchClustersLoaderDataType>();

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('searchText', searchText ?? '');
    searchParams.set('size', size.toString());

    fetcher.load(
      generatePath(`/data-component/search/clusters/?${searchParams.toString()}`),
    );
  }, [searchText, size]);
  return {
    status: fetcher.state,
    clusters: fetcher.data?.clusters ?? [],
    hasNext: fetcher.data?.hasNext ?? false,
  };
};
