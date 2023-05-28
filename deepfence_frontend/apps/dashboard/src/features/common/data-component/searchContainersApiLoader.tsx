import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';

export type SearchContainersLoaderDataType = {
  containers: {
    nodeId: string;
    nodeName: string;
  }[];
  hasNext: boolean;
};

export const searchContainersApiLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<SearchContainersLoaderDataType> => {
  const scanType = params?.scanType;
  if (!scanType) {
    throw new Error('Scan For is required');
  }
  const searchParams = new URL(request.url).searchParams;
  const searchText = searchParams?.get('searchText')?.toString();
  const size = parseInt(searchParams?.get('size')?.toString() ?? '0', 10);

  const matchFilter = { filter_in: {} };
  if (searchText?.length) {
    matchFilter.filter_in = {
      node_name: [searchText],
    };
  }

  let filterValue = '';
  if (scanType === ScanTypeEnum.SecretScan) {
    filterValue = 'secrets_count';
  } else if (scanType === ScanTypeEnum.VulnerabilityScan) {
    filterValue = 'vulnerabilities_count';
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    filterValue = 'malwares_count';
  } else if (scanType === ScanTypeEnum.ComplianceScan) {
    filterValue = 'compliances_count';
  }

  const searchContainersApi = apiWrapper({
    fn: getSearchApiClient().searchContainers,
  });
  const searchContainersResponse = await searchContainersApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          contains_filter: {
            filter_in: {},
          },
          order_filter: {
            order_fields: [
              {
                field_name: filterValue,
                descending: true,
              },
            ],
          },
          match_filter: matchFilter,
          compare_filter: null,
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
  if (!searchContainersResponse.ok) {
    throw searchContainersResponse.error;
  }

  if (searchContainersResponse.value === null) {
    return {
      containers: [],
      hasNext: false,
    };
  }
  return {
    containers: searchContainersResponse.value.slice(0, size).map((res) => {
      return {
        nodeId: res.node_id,
        nodeName: res.docker_container_name,
      };
    }),
    hasNext: searchContainersResponse.value.length > size,
  };
};

export const useGetContainersList = ({
  scanType,
  searchText,
  size,
}: {
  scanType: ScanTypeEnum | 'none';
  searchText?: string;
  size: number;
}): {
  status: 'idle' | 'loading' | 'submitting';
  containers: SearchContainersLoaderDataType['containers'];
  hasNext: boolean;
} => {
  const fetcher = useFetcher<SearchContainersLoaderDataType>();

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('searchText', searchText ?? '');
    searchParams.set('size', size.toString());
    fetcher.load(
      generatePath(
        `/data-component/search/containers/:scanType/?${searchParams.toString()}`,
        {
          scanType,
        },
      ),
    );
  }, [scanType, searchText, size]);

  return {
    status: fetcher.state,
    containers: fetcher.data?.containers ?? [],
    hasNext: fetcher.data?.hasNext ?? false,
  };
};
