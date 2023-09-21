import { createQueryKeys } from '@lukemorales/query-key-factory';

import {
  getCloudComplianceApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ModelNodeIdentifierNodeTypeEnum, ModelScanListReq } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';

export const commonQueries = createQueryKeys('common', {
  scanHistories: (filters: {
    nodeId: string;
    nodeType: string;
    scanType: ScanTypeEnum;
    size: number;
  }) => {
    const { nodeId, nodeType, size, scanType } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async ({ pageParam = 0 }) => {
        if (!nodeId || !nodeType || !scanType) {
          throw new Error('Scan Type, Node Type and Node Id are required');
        }

        const getScanHistory = apiWrapper({
          fn: {
            [ScanTypeEnum.CloudComplianceScan]:
              getCloudComplianceApiClient().listCloudComplianceScan,
            [ScanTypeEnum.ComplianceScan]: getComplianceApiClient().listComplianceScan,
            [ScanTypeEnum.VulnerabilityScan]:
              getVulnerabilityApiClient().listVulnerabilityScans,
            [ScanTypeEnum.SecretScan]: getSecretApiClient().listSecretScans,
            [ScanTypeEnum.MalwareScan]: getMalwareApiClient().listMalwareScans,
          }[scanType],
        });

        const requestParams: ModelScanListReq = {
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
            offset: pageParam,
            size,
          },
        };

        const result = await getScanHistory({
          modelScanListReq: requestParams,
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
          data: result.value.scans_info.slice(0, size)?.map((res) => {
            return {
              updatedAt: res.updated_at,
              scanId: res.scan_id,
              status: res.status,
              nodeName: res.node_name,
            };
          }),
        };
      },
    };
  },
});
