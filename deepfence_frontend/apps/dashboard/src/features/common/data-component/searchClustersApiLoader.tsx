import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

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
  const pseudo = searchParams?.get('pseudo')?.toString();
  const active = searchParams?.get('active')?.toString();

  const matchFilter = { filter_in: {} };
  if (searchText?.length) {
    matchFilter.filter_in = {
      node_name: [searchText],
    };
  }
  const searchKubernetesClustersApi = apiWrapper({
    fn: getSearchApiClient().searchKubernetesClusters,
  });
  const searchKubernetesClustersResponse = await searchKubernetesClustersApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          compare_filter: null,
          contains_filter: {
            filter_in: {
              ...(pseudo !== undefined && { pseudo: [pseudo === 'true'] }),
              ...(active !== undefined && { active: [active === 'true'] }),
            },
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
  });
  if (!searchKubernetesClustersResponse.ok) {
    throw searchKubernetesClustersResponse.error;
  }

  if (searchKubernetesClustersResponse.value === null) {
    return {
      clusters: [],
      hasNext: false,
    };
  }

  return {
    clusters: searchKubernetesClustersResponse.value.slice(0, size).map((res) => {
      return {
        clusterId: res.node_id,
        clusterName: res.node_name,
      };
    }),
    hasNext: searchKubernetesClustersResponse.value.length > size,
  };
};

export const useGetClustersList = ({
  searchText,
  size,
  active,
  pseudo,
}: {
  searchText?: string;
  size: number;
  active?: boolean;
  pseudo?: boolean;
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
    if (active !== undefined) {
      searchParams.set('active', active.toString());
    }
    if (pseudo !== undefined) {
      searchParams.set('pseudo', pseudo.toString());
    }

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
