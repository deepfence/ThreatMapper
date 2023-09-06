import { useEffect } from 'react';
import { generatePath, LoaderFunctionArgs, useFetcher } from 'react-router-dom';

import { getSearchApiClient } from '@/api/api';
import { apiWrapper } from '@/utils/api';

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
  const getCloudComplianceFiltersApi = apiWrapper({
    fn: getSearchApiClient().getCloudComplianceFilters,
  });
  const getCloudComplianceFiltersResponse = await getCloudComplianceFiltersApi({
    modelFiltersReq: {
      filters: ['service', 'status'],
      having: {
        scan_id: scanId,
      },
    },
  });
  if (!getCloudComplianceFiltersResponse.ok) {
    throw getCloudComplianceFiltersResponse.error;
  }

  if (
    !getCloudComplianceFiltersResponse.value ||
    !getCloudComplianceFiltersResponse.value.filters
  ) {
    return {
      services: [],
      statuses: [],
    };
  }

  return {
    services: getCloudComplianceFiltersResponse.value.filters.service ?? [],
    statuses: getCloudComplianceFiltersResponse.value.filters.status ?? [],
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
          scanId: encodeURIComponent(scanId),
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
