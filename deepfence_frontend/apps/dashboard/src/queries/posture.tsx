import { createQueryKeys } from '@lukemorales/query-key-factory';

import {
  getCloudComplianceApiClient,
  getCloudNodesApiClient,
  getComplianceApiClient,
  getControlsApiClient,
  getLookupApiClient,
  getSearchApiClient,
} from '@/api/api';
import {
  ModelCloudNodeControlReqCloudProviderEnum,
  ModelNodeIdentifierNodeTypeEnum,
  ModelScanResultsReq,
  SearchSearchNodeReq,
} from '@/api/generated';
import { ScanStatusEnum, ScanTypeEnum } from '@/types/common';
import { apiWrapper } from '@/utils/api';
import { ComplianceScanGroupedStatus } from '@/utils/scan';
import { COMPLIANCE_SCAN_STATUS_GROUPS } from '@/utils/scan';

export const postureQueries = createQueryKeys('posture', {
  postureSummary: () => {
    return {
      queryKey: ['postureSummary'],
      queryFn: async () => {
        const getPostureSummary = apiWrapper({
          fn: getCloudNodesApiClient().listCloudProviders,
        });
        const result = await getPostureSummary();
        if (!result.ok) {
          throw result.error;
        }
        if (!result.value.providers) {
          result.value.providers = [];
        }
        return result.value;
      },
    };
  },
  postureAccounts: (filters: {
    page?: number;
    pageSize: number;
    status: string[];
    complianceScanStatus?: ComplianceScanGroupedStatus;
    nodeType: string;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    const { page = 1, pageSize, complianceScanStatus, status, order, nodeType } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        if (!nodeType) {
          throw new Error('Cloud Node Type is required');
        }
        const searchReq: SearchSearchNodeReq = {
          node_filter: {
            in_field_filter: [],
            filters: {
              compare_filter: [],
              contains_filter: { filter_in: { cloud_provider: [nodeType] } },
              match_filter: { filter_in: {} },
              order_filter: { order_fields: [] },
              not_contains_filter: { filter_in: {} },
            },
            window: {
              offset: 0,
              size: 0,
            },
          },
          window: { offset: page * pageSize, size: pageSize },
        };

        if (status && status.length) {
          if (status.length === 1) {
            if (status[0] === 'active') {
              searchReq.node_filter.filters.contains_filter.filter_in!['active'] = [true];
            } else {
              searchReq.node_filter.filters.contains_filter.filter_in!['active'] = [
                false,
              ];
            }
          }
        }

        if (complianceScanStatus) {
          if (complianceScanStatus === ComplianceScanGroupedStatus.neverScanned) {
            searchReq.node_filter.filters.not_contains_filter!.filter_in = {
              ...searchReq.node_filter.filters.not_contains_filter!.filter_in,
              compliance_scan_status: [
                ...COMPLIANCE_SCAN_STATUS_GROUPS.complete,
                ...COMPLIANCE_SCAN_STATUS_GROUPS.error,
                ...COMPLIANCE_SCAN_STATUS_GROUPS.inProgress,
                ...COMPLIANCE_SCAN_STATUS_GROUPS.starting,
              ],
            };
          } else {
            searchReq.node_filter.filters.contains_filter.filter_in = {
              ...searchReq.node_filter.filters.contains_filter.filter_in,
              compliance_scan_status: COMPLIANCE_SCAN_STATUS_GROUPS[complianceScanStatus],
            };
          }
        }
        if (order) {
          searchReq.node_filter.filters.order_filter.order_fields = [
            {
              field_name: order.sortBy,
              descending: order.descending,
            },
          ];
        }

        const searchCloudAccounts = apiWrapper({
          fn: getSearchApiClient().searchCloudAccounts,
        });
        const result = await searchCloudAccounts({
          searchSearchNodeReq: searchReq,
        });
        if (!result.ok) {
          throw result.error;
        }
        const countsResultApi = apiWrapper({
          fn: getSearchApiClient().searchCloudAccountsCount,
        });
        const countsResult = await countsResultApi({
          searchSearchNodeReq: {
            ...searchReq,
            window: {
              ...searchReq.window,
              size: 10 * searchReq.window.size,
            },
          },
        });
        if (!countsResult.ok) {
          throw countsResult.error;
        }

        return {
          accounts: result.value ?? [],
          currentPage: page,
          totalRows: page * pageSize + countsResult.value.count,
        };
      },
    };
  },
  postureScanResults: (filters: {
    scanId: string;
    page?: number;
    pageSize: number;
    status: string[];
    visibility: string[];
    benchmarkTypes: string[];
    nodeType: string;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        const {
          scanId,
          visibility,
          status,
          benchmarkTypes,
          order,
          page = 1,
          pageSize,
        } = filters;
        const statusComplianceScanApi = apiWrapper({
          fn: getComplianceApiClient().statusComplianceScan,
        });
        const statusResult = await statusComplianceScanApi({
          modelScanStatusReq: {
            scan_ids: [scanId],
            bulk_scan_id: '',
          },
        });
        if (!statusResult.ok) {
          if (statusResult.error.response.status === 400) {
            return {
              message: statusResult.error.message,
            };
          }
          throw statusResult.error;
        }
        if (!statusResult.value || !statusResult.value?.statuses?.[scanId]) {
          throw new Error('Scan status not found');
        }
        const scanStatus = statusResult?.value.statuses?.[scanId].status;
        const isScanRunning =
          scanStatus !== ScanStatusEnum.complete && scanStatus !== ScanStatusEnum.error;
        const isScanError = scanStatus === ScanStatusEnum.error;

        if (isScanRunning || isScanError) {
          return {
            scanStatusResult: statusResult.value.statuses[scanId],
          };
        }
        const scanResultsReq: ModelScanResultsReq = {
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
          scan_id: scanId,
          window: {
            offset: page * pageSize,
            size: pageSize,
          },
        };
        if (status.length) {
          scanResultsReq.fields_filter.contains_filter.filter_in!['status'] = status;
        }
        if (visibility.length === 1) {
          scanResultsReq.fields_filter.contains_filter.filter_in!['masked'] = [
            visibility.includes('masked') ? true : false,
          ];
        }
        if (benchmarkTypes.length) {
          scanResultsReq.fields_filter.contains_filter.filter_in![
            'compliance_check_type'
          ] = benchmarkTypes;
        }
        if (order) {
          scanResultsReq.fields_filter.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }

        //
        let result = null;
        let resultCounts = null;

        const resultCloudComplianceScanApi = apiWrapper({
          fn: getComplianceApiClient().resultComplianceScan,
        });
        result = await resultCloudComplianceScanApi({
          modelScanResultsReq: scanResultsReq,
        });
        if (!result.ok) {
          if (
            result.error.response.status === 400 ||
            result.error.response.status === 404
          ) {
            return {
              message: result.error.message ?? '',
            };
          }
          throw result.error;
        }

        const resultCountComplianceScanApi = apiWrapper({
          fn: getComplianceApiClient().resultCountComplianceScan,
        });
        resultCounts = await resultCountComplianceScanApi({
          modelScanResultsReq: {
            ...scanResultsReq,
            window: {
              ...scanResultsReq.window,
              size: 10 * scanResultsReq.window.size,
            },
          },
        });

        if (!resultCounts.ok) {
          if (
            resultCounts.error.response.status === 400 ||
            resultCounts.error.response.status === 404
          ) {
            return {
              message: resultCounts.error.message ?? '',
            };
          }
          throw resultCounts.error;
        }

        const totalStatus = Object.values(result.value.status_counts ?? {}).reduce(
          (acc, value) => {
            acc = acc + value;
            return acc;
          },
          0,
        );

        const linuxComplianceStatus = {
          info: result.value.status_counts?.['info'] ?? 0,
          pass: result.value.status_counts?.['pass'] ?? 0,
          warn: result.value.status_counts?.['warn'] ?? 0,
          note: result.value.status_counts?.['note'] ?? 0,
        };

        const clusterComplianceStatus = {
          alarm: result.value.status_counts?.['alarm'] ?? 0,
          info: result.value.status_counts?.['info'] ?? 0,
          ok: result.value.status_counts?.['ok'] ?? 0,
          skip: result.value.status_counts?.['skip'] ?? 0,
          delete: result.value.status_counts?.['delete'] ?? 0,
        };

        return {
          scanStatusResult: statusResult.value.statuses[scanId],
          data: {
            totalStatus,
            statusCounts:
              result.value.node_type === 'host'
                ? linuxComplianceStatus
                : clusterComplianceStatus,
            timestamp: result.value.updated_at,
            compliances: result.value.compliances ?? [],
            pagination: {
              currentPage: page,
              totalRows: page * pageSize + resultCounts.value.count,
            },
          },
        };
      },
    };
  },
  scanHistories: (filters: {
    nodeId: string;
    nodeType: string;
    scanType: 'ComplianceScan' | 'CloudComplianceScan';
  }) => {
    const { nodeId, nodeType, scanType } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        if (!nodeId || !nodeType || !scanType) {
          throw new Error('Scan Type, Node Type and Node Id are required');
        }

        const getScanHistory = apiWrapper({
          fn: {
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
      },
    };
  },
  postureCloudScanResults: (filters: {
    scanId: string;
    page?: number;
    pageSize: number;
    status: string[];
    visibility: string[];
    benchmarkTypes: string[];
    services: string[];
    nodeType: string;
    order?: {
      sortBy: string;
      descending: boolean;
    };
  }) => {
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        const {
          scanId,
          visibility,
          status,
          services,
          benchmarkTypes,
          order,
          page = 1,
          pageSize,
        } = filters;
        const statusCloudComplianceScanApi = apiWrapper({
          fn: getCloudComplianceApiClient().statusCloudComplianceScan,
        });
        const statusResult = await statusCloudComplianceScanApi({
          modelScanStatusReq: {
            scan_ids: [scanId],
            bulk_scan_id: '',
          },
        });

        if (!statusResult.ok) {
          if (statusResult.error.response.status === 400) {
            return {
              message: statusResult.error.message,
            };
          }
          throw statusResult.error;
        }
        const statuses = statusResult.value?.statuses?.[0];

        if (!statusResult || !statuses || !statuses.scan_id) {
          throw new Error('Scan status not found');
        }

        const scanStatus = statuses.status;

        const isScanRunning =
          scanStatus !== ScanStatusEnum.complete && scanStatus !== ScanStatusEnum.error;
        const isScanError = scanStatus === ScanStatusEnum.error;

        if (isScanRunning || isScanError) {
          return {
            scanStatusResult: statuses,
          };
        }
        const scanResultsReq: ModelScanResultsReq = {
          fields_filter: {
            contains_filter: {
              filter_in: {},
            },
            match_filter: { filter_in: {} },
            order_filter: { order_fields: [] },
            compare_filter: null,
          },
          scan_id: scanId,
          window: {
            offset: page * pageSize,
            size: pageSize,
          },
        };
        if (status.length) {
          scanResultsReq.fields_filter.contains_filter.filter_in!['status'] = status;
        }
        if (visibility.length === 1) {
          scanResultsReq.fields_filter.contains_filter.filter_in!['masked'] = [
            visibility.includes('masked') ? true : false,
          ];
        }
        if (benchmarkTypes.length) {
          scanResultsReq.fields_filter.contains_filter.filter_in![
            'compliance_check_type'
          ] = benchmarkTypes.map((type) => type.toLowerCase());
        }

        if (services.length) {
          scanResultsReq.fields_filter.contains_filter.filter_in!['service'] = services;
        }
        if (order) {
          scanResultsReq.fields_filter.order_filter.order_fields?.push({
            field_name: order.sortBy,
            descending: order.descending,
          });
        }

        //
        let result = null;
        let resultCounts = null;

        const resultCloudComplianceScanApi = apiWrapper({
          fn: getCloudComplianceApiClient().resultCloudComplianceScan,
        });
        result = await resultCloudComplianceScanApi({
          modelScanResultsReq: scanResultsReq,
        });
        if (!result.ok) {
          if (
            result.error.response.status === 400 ||
            result.error.response.status === 404
          ) {
            return {
              message: result.error.message ?? '',
            };
          }
          throw result.error;
        }

        const resultCountCloudComplianceScanApi = apiWrapper({
          fn: getCloudComplianceApiClient().resultCountCloudComplianceScan,
        });
        resultCounts = await resultCountCloudComplianceScanApi({
          modelScanResultsReq: {
            ...scanResultsReq,
            window: {
              ...scanResultsReq.window,
              size: 10 * scanResultsReq.window.size,
            },
          },
        });

        if (!resultCounts.ok) {
          if (
            resultCounts.error.response.status === 400 ||
            resultCounts.error.response.status === 404
          ) {
            return {
              message: resultCounts.error.message ?? '',
            };
          }
          throw resultCounts.error;
        }

        const totalStatus = Object.values(result.value.status_counts ?? {}).reduce(
          (acc, value) => {
            acc = acc + value;
            return acc;
          },
          0,
        );

        const cloudComplianceStatus = {
          alarm: result.value.status_counts?.['alarm'] ?? 0,
          info: result.value.status_counts?.['info'] ?? 0,
          ok: result.value.status_counts?.['ok'] ?? 0,
          skip: result.value.status_counts?.['skip'] ?? 0,
          delete: result.value.status_counts?.['delete'] ?? 0,
        };

        return {
          scanStatusResult: statuses,
          data: {
            totalStatus,
            nodeName: result.value.node_id,
            statusCounts: cloudComplianceStatus,
            timestamp: result.value.updated_at,
            compliances: result.value.compliances ?? [],
            pagination: {
              currentPage: page,
              totalRows: page * pageSize + resultCounts.value.count,
            },
          },
        };
      },
    };
  },
  listControls: (filters: { nodeType: string; checkType: string }) => {
    const { nodeType, checkType } = filters;
    return {
      queryKey: [{ filters }],
      queryFn: async () => {
        if (!nodeType || !checkType) {
          return {
            controls: [],
            message: '',
          };
        }

        const listControlsApi = apiWrapper({
          fn: getControlsApiClient().listControls,
        });
        const result = await listControlsApi({
          modelCloudNodeControlReq: {
            cloud_provider: nodeType as ModelCloudNodeControlReqCloudProviderEnum,
            compliance_type: checkType,
            node_id: '',
          },
        });
        if (!result.ok) {
          if (result.error.response.status === 400) {
            return {
              message: result.error.message,
              controls: [],
            };
          }
          if (result.error.response.status === 403) {
            return {
              message: 'You do not have enough permissions to view controls',
              controls: [],
            };
          }
          throw result.error;
        }

        if (!result.value) {
          return {
            message: '',
            controls: [],
          };
        }

        return { controls: result.value.controls ?? [], message: '' };
      },
    };
  },
  scanResultSummaryCountsCompliance: (filters: { scanId: string }) => {
    return {
      queryKey: [filters],
      queryFn: async () => {
        const { scanId } = filters;
        const resultComplianceScanApi = apiWrapper({
          fn: getComplianceApiClient().resultComplianceScan,
        });
        const complianceScanResults = await resultComplianceScanApi({
          modelScanResultsReq: {
            scan_id: scanId,
            window: {
              offset: 0,
              size: 1,
            },
            fields_filter: {
              contains_filter: {
                filter_in: {},
              },
              match_filter: {
                filter_in: {},
              },
              order_filter: { order_fields: [] },
              compare_filter: null,
            },
          },
        });

        if (!complianceScanResults.ok) {
          console.error(complianceScanResults);
          throw new Error("Couldn't get compliance scan results");
        }
        return {
          scanId,
          timestamp: complianceScanResults.value.created_at,
          counts: complianceScanResults.value.status_counts ?? {},
        };
      },
    };
  },
});
