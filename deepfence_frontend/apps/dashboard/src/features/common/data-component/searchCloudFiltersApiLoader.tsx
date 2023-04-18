import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type CloudType = 'aws' | 'azure' | 'gcp';

export type CloudFiltersType = {
  services: string[];
  statuses: string[];
};

export const searchCloudFiltersApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<CloudFiltersType> => {
  const scanId = params?.scanId;
  if (!scanId) {
    throw new Error('Scan id is required');
  }

  const result = await makeRequest({
    apiFunction: getSearchApiClient().getCloudComplianceFilters,
    apiArgs: [
      {
        modelFiltersReq: {
          filters: ['service', 'status'],
          having: {
            scan_id: scanId,
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

  if (!result || !result.filters) {
    return {
      services: [],
      statuses: [],
    };
  }

  return {
    services: result.filters.service ?? [],
    statuses: result.filters.status ?? [],
  };
};

export const useGetCloudFilters = (
  scanId: string,
): {
  status: 'idle' | 'loading' | 'submitting';
  filters: CloudFiltersType;
} => {
  const fetcher = useFetcher<CloudFiltersType>();

  useEffect(() => {
    if (scanId) {
      fetcher.load(
        generatePath('/data-component/search/cloud/filters/:scanId', {
          scanId,
        }),
      );
    }
  }, [scanId]);

  return {
    status: fetcher.state,
    filters: {
      services: fetcher.data?.services ?? [],
      statuses: fetcher.data?.statuses ?? [],
    },
  };
};
