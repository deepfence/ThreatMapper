import { createQueryKeys } from '@lukemorales/query-key-factory';

import {
  getCloudComplianceApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getScanResultCompletionApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import {
  CompletionCompletionNodeFieldReq,
  ModelNodeIdentifierNodeTypeEnum,
  ModelScanListReq,
} from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';
import { getResponseErrors } from '@/utils/403';
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
          return {
            data: [],
          };
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
          const { message } = await getResponseErrors(result.error);
          return {
            error: 'Error getting scan history',
            message,
            data: [],
          };
        }

        if (!result.value.scans_info) {
          return {
            data: [],
          };
        }

        return {
          data: (result.value.scans_info ?? []).slice(0, size)?.map((res) => {
            return {
              createdAt: res.created_at,
              scanId: res.scan_id,
              status: res.status,
              nodeName: res.node_name,
            };
          }),
        };
      },
    };
  },
  searchHostFilters: (filters: {
    fieldName: string;
    searchText: string;
    size: number;
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({ pageParam = 0 }) => {
        const { fieldName, searchText, size } = filters;

        const scanResultsReq: CompletionCompletionNodeFieldReq = {
          completion: searchText,
          field_name: fieldName,
          window: {
            offset: pageParam,
            size,
          },
        };

        const api = apiWrapper({
          fn: getScanResultCompletionApiClient().completeHostInfo,
        });
        const response = await api({
          completionCompletionNodeFieldReq: scanResultsReq,
        });

        if (!response.ok) {
          throw response.error;
        }

        if (response.value === null) {
          // TODO: handle this case with 404 status maybe
          throw new Error('Error getting host filters');
        }

        return {
          data: response.value.possible_values?.slice(0, size) || [],
        };
      },
    };
  },
  searchPostureCompletionFilters: (filters: {
    scanId: string;
    fieldName: string;
    searchText: string;
    size: number;
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({ pageParam = 0 }) => {
        const { fieldName, searchText, size, scanId } = filters;

        const scanResultsReq: CompletionCompletionNodeFieldReq = {
          completion: searchText,
          field_name: fieldName,
          scan_id: scanId,
          window: {
            offset: pageParam,
            size,
          },
        };

        const api = apiWrapper({
          fn: getScanResultCompletionApiClient().completeComplianceInfo,
        });
        const response = await api({
          completionCompletionNodeFieldReq: scanResultsReq,
        });

        if (!response.ok) {
          throw response.error;
        }

        if (response.value === null) {
          // TODO: handle this case with 404 status maybe
          throw new Error('Error getting test number filters');
        }

        return {
          data: response.value.possible_values?.slice(0, size) || [],
        };
      },
    };
  },
  searchPostureCloudCompletionFilters: (filters: {
    scanId: string;
    fieldName: string;
    searchText: string;
    size: number;
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async ({ pageParam = 0 }) => {
        const { fieldName, searchText, size, scanId } = filters;

        const scanResultsReq: CompletionCompletionNodeFieldReq = {
          scan_id: scanId,
          completion: searchText,
          field_name: fieldName,
          window: {
            offset: pageParam,
            size,
          },
        };

        const api = apiWrapper({
          fn: getScanResultCompletionApiClient().completeCloudCompliance,
        });
        const response = await api({
          completionCompletionNodeFieldReq: scanResultsReq,
        });

        if (!response.ok) {
          throw response.error;
        }

        if (response.value === null) {
          // TODO: handle this case with 404 status maybe
          throw new Error('Error getting control filters');
        }

        return {
          data: response.value.possible_values?.slice(0, size) || [],
        };
      },
    };
  },
});
