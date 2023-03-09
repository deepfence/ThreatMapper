import { ActionFunctionArgs } from 'react-router-dom';

import { getVulnerabilityApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
  ModelVulnerabilityScanConfigLanguageLanguageEnum,
  ModelVulnerabilityScanTriggerReq,
} from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

export type ScanActionReturnType = {
  message?: string;
};

export const startVulnerabilityScanAction = async ({
  request,
}: ActionFunctionArgs): Promise<ScanActionReturnType> => {
  const formData = await request.formData();
  const nodeIds = formData.get('_nodeIds')?.toString().split(',') ?? [];
  const nodeType = formData.get('_nodeType')?.toString() ?? '';
  const selectAll = formData.get('selectAll')?.toString() ?? '';
  const packages = formData.getAll('packages');

  const requestBody: ModelVulnerabilityScanTriggerReq = {
    filters: {
      cloud_account_scan_filter: { filter_in: null },
      kubernetes_cluster_scan_filter: { filter_in: null },
      container_scan_filter: { filter_in: null },
      host_scan_filter: { filter_in: null },
      image_scan_filter: { filter_in: null },
    },
    node_ids: nodeIds.map((nodeId) => ({
      node_id: nodeId,
      node_type: (nodeType === 'kubernetes_cluster'
        ? 'cluster'
        : nodeType) as ModelNodeIdentifierNodeTypeEnum,
    })),
    scan_config:
      selectAll === 'all'
        ? [
            {
              language: ModelVulnerabilityScanConfigLanguageLanguageEnum.All,
            },
          ]
        : packages.map((pkg) => ({
            language: pkg as unknown as ModelVulnerabilityScanConfigLanguageLanguageEnum,
          })),
  };

  const r = await makeRequest({
    apiFunction: getVulnerabilityApiClient().startVulnerabilityScan,
    apiArgs: [
      {
        modelVulnerabilityScanTriggerReq: requestBody,
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ScanActionReturnType>({});
      if (r.status === 400 || r.status === 409) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }
  return {
    message: 'Scan started',
  };
};
