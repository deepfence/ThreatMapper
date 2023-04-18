import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { ApiError, makeRequest } from '@/utils/api';

export type SearchContainerImagesLoaderDataType = {
  containerImages: {
    nodeId: string;
    containerImage: string;
  }[];
};

export const searchContainerImagesApiLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<SearchContainerImagesLoaderDataType> => {
  const scanType = params?.scanType;
  if (!scanType) {
    throw new Error('Scan For is required');
  }
  const searchParams = new URL(request.url).searchParams;
  const searchText = searchParams?.get('searchText')?.toString();
  const offset = searchParams?.get('offset')?.toString() ?? '0';

  const matchFilter = { filter_in: {} };
  if (searchText?.length) {
    matchFilter.filter_in = {
      docker_image_name: [searchText],
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
    apiFunction: getSearchApiClient().searchContainerImages,
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
            in_field_filter: ['node_id', 'docker_image_name', 'docker_image_tag'],
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
      const error = new ApiError<{ message?: string }>({});
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
      containerImages: [],
    };
  }
  return {
    containerImages: result.map((res) => {
      return {
        nodeId: res.node_id,
        containerImage: `${res.docker_image_name}:${res.docker_image_tag}`,
      };
    }),
  };
};

export const useGetContainerImagesList = ({
  scanType,
  searchText,
  offset = 0,
}: {
  scanType: ScanTypeEnum | 'none';
  searchText?: string;
  offset?: number;
}): {
  status: 'idle' | 'loading' | 'submitting';
  containerImages: SearchContainerImagesLoaderDataType['containerImages'];
} => {
  const fetcher = useFetcher<SearchContainerImagesLoaderDataType>();

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('searchText', searchText ?? '');
    searchParams.set('offset', offset.toString());

    fetcher.load(
      generatePath(
        `/data-component/search/containerImages/:scanType/?${searchParams.toString()}`,
        {
          scanType,
        },
      ),
    );
  }, [scanType, searchText, offset]);

  return {
    status: fetcher.state,
    containerImages: fetcher.data?.containerImages ?? [],
  };
};
