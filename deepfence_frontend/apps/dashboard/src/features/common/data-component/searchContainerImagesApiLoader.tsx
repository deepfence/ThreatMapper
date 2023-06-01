import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';

export type SearchContainerImagesLoaderDataType = {
  containerImages: {
    nodeId: string;
    containerImage: string;
  }[];
  hasNext: boolean;
};

export const searchContainerImagesApiLoader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<SearchContainerImagesLoaderDataType> => {
  const searchParams = new URL(request.url).searchParams;
  const scanType = params?.scanType;
  if (!scanType) {
    throw new Error('Scan For is required');
  }
  const searchText = searchParams?.get('searchText')?.toString();
  const size = parseInt(searchParams?.get('size')?.toString() ?? '0', 10);
  const pseudo = searchParams?.get('pseudo')?.toString() || false;
  const active = searchParams?.get('active')?.toString();

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

  const searchContainerImagesApi = apiWrapper({
    fn: getSearchApiClient().searchContainerImages,
  });
  const searchContainerImagesResponse = await searchContainerImagesApi({
    searchSearchNodeReq: {
      node_filter: {
        filters: {
          contains_filter: {
            filter_in: {
              ...(pseudo !== undefined && { pseudo: [pseudo === 'true'] }),
              ...(active !== undefined && { active: [active === 'true'] }),
            },
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
        offset: 0,
        size: size + 1,
      },
    },
  });

  if (!searchContainerImagesResponse.ok) {
    throw searchContainerImagesResponse.error;
  }

  if (searchContainerImagesResponse.value === null) {
    return {
      containerImages: [],
      hasNext: false,
    };
  }
  return {
    containerImages: searchContainerImagesResponse.value.slice(0, size).map((res) => {
      return {
        nodeId: res.node_id,
        containerImage: `${res.docker_image_name}:${res.docker_image_tag}`,
      };
    }),
    hasNext: searchContainerImagesResponse.value.length > size,
  };
};

export const useGetContainerImagesList = ({
  scanType,
  searchText,
  size = 0,
  active = true,
  pseudo = false,
}: {
  scanType: ScanTypeEnum | 'none';
  searchText?: string;
  size: number;
  active?: boolean;
  pseudo?: boolean;
}): {
  status: 'idle' | 'loading' | 'submitting';
  containerImages: SearchContainerImagesLoaderDataType['containerImages'];
  hasNext: boolean;
} => {
  const fetcher = useFetcher<SearchContainerImagesLoaderDataType>();

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
      generatePath(
        `/data-component/search/containerImages/:scanType/?${searchParams.toString()}`,
        {
          scanType,
        },
      ),
    );
  }, [scanType, searchText, size]);
  return {
    status: fetcher.state,
    containerImages: fetcher.data?.containerImages ?? [],
    hasNext: fetcher.data?.hasNext ?? false,
  };
};
