import { LoaderFunctionArgs } from 'react-router-dom';

import { getVulnerabilityApiClient } from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
} from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

type ScanList = {
  updatedAt: number;
  scanId: string;
  status: string;
};
export type ApiVulnerableLoaderDataType = {
  error?: string;
  message?: string;
  data: ScanList[];
};

async function getVulnerabilityScanList(
  nodeId: string,
  nodeType: string,
): Promise<ApiVulnerableLoaderDataType> {
  const result = await makeRequest({
    apiFunction: getVulnerabilityApiClient().listVulnerabilityScans,
    apiArgs: [
      {
        modelScanListReq: {
          node_ids: [
            {
              node_id: nodeId.toString(),
              node_type: nodeType.toString() as ModelNodeIdentifierNodeTypeEnum,
            },
          ],
          window: {
            offset: 0,
            size: 50,
          },
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<{
        message?: string;
      }>({});
      if (r.status === 400 || r.status === 409) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(result)) {
    throw result.value();
  }

  if (!result.scans_info) {
    return {
      data: [],
    };
  }

  return {
    data: result.scans_info?.map((res) => {
      return {
        updatedAt: res.updated_at,
        scanId: res.scan_id,
        status: res.status,
      };
    }),
  };
}

export const vulnerabilityApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ApiVulnerableLoaderDataType> => {
  const nodeId = params?.nodeId;
  const nodeType = params?.nodeType;
  if (!nodeId || !nodeType) {
    throw new Error('Node Type and Node Id are required');
  }

  return await getVulnerabilityScanList(nodeId, nodeType);
};
