import { ActionFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';

export type ContainersListType = {
  nodeId: string;
  nodeName: string;
};

export const searchContainersApiAction = async ({
  request,
}: ActionFunctionArgs): Promise<ContainersListType[]> => {
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
    apiFunction: getSearchApiClient().searchContainers,
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
      nodeId: res.node_id,
      nodeName: res.docker_container_name,
    };
  });
};

type LoadArgs = {
  scanType: ScanTypeEnum | 'none';
  searchText?: string;
  offset?: number;
};

export const useGetContainersList = (): {
  status: 'idle' | 'loading' | 'submitting';
  containers: ContainersListType[];
  load: (_: LoadArgs) => void;
} => {
  const fetcher = useFetcher<ContainersListType[]>();

  return {
    status: fetcher.state,
    containers: fetcher.data ?? [],
    load: ({ scanType, searchText, offset = 0 }: LoadArgs) => {
      const searchParams = new URLSearchParams();
      searchParams.set('searchText', searchText ?? '');
      searchParams.set('offset', offset.toString());
      searchParams.set('scanType', scanType.toString());

      fetcher.submit(null, {
        method: 'post',
        action: `/data-component/search/containers/?${searchParams.toString()}`,
      });
    },
  };
};
