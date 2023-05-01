import { LoaderFunctionArgs } from 'react-router-dom';

import { getThreatGraphApiClient } from '@/api/api';
import { GraphProviderThreatGraph, GraphThreatFiltersTypeEnum } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type ThreatGraphLoaderData = Awaited<ReturnType<typeof loader>>;

const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<{ [key: string]: GraphProviderThreatGraph }> => {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const type = searchParams.get('type') as GraphThreatFiltersTypeEnum | undefined;
  const cloudResourceOnly = searchParams.get('cloud_resource_only') === 'true';
  const awsAccountIds = searchParams.getAll('aws_account_ids');
  const gcpAccountIds = searchParams.getAll('gcp_account_ids');
  const azureAccountIds = searchParams.getAll('azure_account_ids');
  const threatGraph = await makeRequest({
    apiFunction: getThreatGraphApiClient().getThreatGraph,
    apiArgs: [
      {
        graphThreatFilters: {
          aws_filter: {
            account_ids: awsAccountIds,
          },
          azure_filter: {
            account_ids: azureAccountIds,
          },
          gcp_filter: { account_ids: gcpAccountIds },
          cloud_resource_only: cloudResourceOnly,
          type: type ?? 'all',
        },
      },
    ],
  });
  if (ApiError.isApiError(threatGraph)) {
    throw new Error('Error getting threatgraph');
  }
  return threatGraph;
};

export const module = {
  loader,
};
