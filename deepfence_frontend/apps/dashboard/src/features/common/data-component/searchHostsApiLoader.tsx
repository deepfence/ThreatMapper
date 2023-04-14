import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';

export type HostsListType = {
  nodeId: string;
  hostName: string;
};

export const searchHostsApiLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<HostsListType[]> => {
  const scanType = params?.scanType;
  if (!scanType) {
    throw new Error('Scan For is required');
  }
  const searchParams = new URL(request.url).searchParams;
  const searchText = searchParams?.get('searchText')?.toString();

  const matchFilter = { filter_in: {} };
  if (searchText?.length) {
    matchFilter.filter_in = {
      node_id: [searchText],
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
            size: 100,
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
      nodeId: res.node_id,
      hostName: res.host_name,
      nodeName: res.node_name,
    };
  });
};

export const useGetHostsList = ({
  scanType,
  searchText,
}: {
  scanType: ScanTypeEnum | 'none';
  searchText?: string;
}): {
  status: 'idle' | 'loading' | 'submitting';
  hosts: HostsListType[];
} => {
  const fetcher = useFetcher<HostsListType[]>();

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('searchText', searchText ?? '');

    fetcher.load(
      generatePath(`/data-component/search/hosts/:scanType/?${searchParams.toString()}`, {
        scanType,
      }),
    );
  }, [scanType, searchText]);

  return {
    status: fetcher.state,
    hosts: fetcher.data ?? [],
  };
};
