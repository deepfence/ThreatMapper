import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';

export type SearchHostsLoaderDataType = {
  hosts: {
    nodeId: string;
    hostName: string;
    nodeName: string;
  }[];
  hasNext: boolean;
};

export const searchHostsApiLoader = async ({
  request,
  params,
}: LoaderFunctionArgs): Promise<SearchHostsLoaderDataType> => {
  const searchParams = new URL(request.url).searchParams;
  const scanType = params?.scanType;

  if (!scanType) {
    throw new Error('Scan Type is required');
  }
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

  const result = await makeRequest({
    apiFunction: getSearchApiClient().searchHosts,
    apiArgs: [
      {
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
      hosts: [],
      hasNext: false,
    };
  }
  return {
    hosts: result.slice(0, size).map((res) => {
      return {
        nodeId: res.node_id,
        hostName: res.host_name,
        nodeName: res.node_name,
      };
    }),
    hasNext: result.length > size,
  };
};

export const useGetHostsList = ({
  scanType,
  searchText,
  size,
}: {
  scanType: ScanTypeEnum | 'none';
  searchText?: string;
  size: number;
}): {
  status: 'idle' | 'loading' | 'submitting';
  hosts: SearchHostsLoaderDataType['hosts'];
  hasNext: boolean;
} => {
  const fetcher = useFetcher<SearchHostsLoaderDataType>();

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('searchText', searchText ?? '');
    searchParams.set('size', size.toString());

    fetcher.load(
      generatePath(`/data-component/search/hosts/:scanType/?${searchParams.toString()}`, {
        scanType,
      }),
    );
  }, [scanType, searchText, size]);

  return {
    status: fetcher.state,
    hosts: fetcher.data?.hosts ?? [],
    hasNext: fetcher.data?.hasNext ?? false,
  };
};
