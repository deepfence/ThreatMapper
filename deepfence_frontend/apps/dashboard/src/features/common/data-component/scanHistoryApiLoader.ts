import { LoaderFunctionArgs } from 'react-router-dom';

import {
  getCloudComplianceApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ModelNodeIdentifierNodeTypeEnum } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';

type ScanList = {
  updatedAt: number;
  scanId: string;
  status: string;
};
export type ScanHistoryApiLoaderDataType = {
  error?: string;
  message?: string;
  data: ScanList[];
};

export const scanHistoryApiLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ScanHistoryApiLoaderDataType> => {
  const nodeId = params?.nodeId;
  const nodeType = params?.nodeType;
  const scanType = params?.scanType as ScanTypeEnum;
  if (!nodeId || !nodeType || !scanType) {
    throw new Error('Scan Type, Node Type and Node Id are required');
  }

  const getScanHistory = apiWrapper({
    fn: {
      [ScanTypeEnum.VulnerabilityScan]:
        getVulnerabilityApiClient().listVulnerabilityScans,
      [ScanTypeEnum.SecretScan]: getSecretApiClient().listSecretScans,
      [ScanTypeEnum.MalwareScan]: getMalwareApiClient().listMalwareScans,
      [ScanTypeEnum.CloudComplianceScan]:
        getCloudComplianceApiClient().listCloudComplianceScan,
      [ScanTypeEnum.ComplianceScan]: getComplianceApiClient().listComplianceScan,
    }[scanType],
  });

  const result = await getScanHistory({
    modelScanListReq: {
      fields_filter: {
        contains_filter: {
          filter_in: {},
        },
        match_filter: { filter_in: {} },
        order_filter: { order_fields: [] },
        compare_filter: null,
      },
      node_ids: [
        {
          node_id: nodeId.toString(),
          node_type: nodeType.toString() as ModelNodeIdentifierNodeTypeEnum,
        },
      ],
      window: {
        offset: 0,
        size: Number.MAX_SAFE_INTEGER,
      },
    },
  });

  if (!result.ok) {
    console.error(result.error);
    return {
      error: 'Error getting scan history',
      message: result.error.message,
      data: [],
    };
  }

  if (!result.value.scans_info) {
    return {
      data: [],
    };
  }

  return {
    data: result.value.scans_info?.map((res) => {
      return {
        updatedAt: res.updated_at,
        scanId: res.scan_id,
        status: res.status,
      };
    }),
  };
};
