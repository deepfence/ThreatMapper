import { LoaderFunctionArgs } from 'react-router-dom';

import {
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import {
  ApiDocsBadRequestResponse,
  ModelNodeIdentifierNodeTypeEnum,
  ModelScanResultsActionRequestScanTypeEnum,
} from '@/api/generated';
import { ScanType } from '@/features/common/data-component/searchHostsApiLoader';
import { ApiError, makeRequest } from '@/utils/api';

type ScanList = {
  updatedAt: number;
  scanId: string;
  status: string;
};
export type ApiLoaderDataType = {
  error?: string;
  message?: string;
  data: ScanList[];
};

async function getScanList(
  scanType: ScanType,
  nodeId: string,
  nodeType: string,
): Promise<ApiLoaderDataType> {
  const result = await makeRequest({
    apiFunction: {
      [ModelScanResultsActionRequestScanTypeEnum.VulnerabilityScan]:
        getVulnerabilityApiClient().listVulnerabilityScans,
      [ModelScanResultsActionRequestScanTypeEnum.SecretScan]:
        getSecretApiClient().listSecretScans,
      [ModelScanResultsActionRequestScanTypeEnum.MalwareScan]:
        getMalwareApiClient().listMalwareScans,
      [ModelScanResultsActionRequestScanTypeEnum.CloudComplianceScan]:
        getComplianceApiClient().listComplianceScan,
      [ModelScanResultsActionRequestScanTypeEnum.ComplianceScan]:
        getComplianceApiClient().listComplianceScan,
    }[scanType],

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

export const scanHistoryApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ApiLoaderDataType> => {
  const nodeId = params?.nodeId;
  const nodeType = params?.nodeType;
  const scanType = params?.scanType;
  if (!nodeId || !nodeType || !scanType) {
    throw new Error('Scan Type, Node Type and Node Id are required');
  }

  return await getScanList(
    scanType as ModelScanResultsActionRequestScanTypeEnum,
    nodeId,
    nodeType,
  );
};
