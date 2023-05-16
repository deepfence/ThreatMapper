import {
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ScanSummary } from '@/features/topology/types/node-details';
import { ApiError, makeRequest } from '@/utils/api';

export const getSecretScanCounts = async (
  secretScanId?: string,
): Promise<ScanSummary | null> => {
  if (!secretScanId || !secretScanId.length) {
    return null;
  }
  const secretScanResults = await makeRequest({
    apiFunction: getSecretApiClient().resultSecretScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: secretScanId,
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
      },
    ],
  });
  if (ApiError.isApiError(secretScanResults)) {
    console.error(secretScanResults);
    throw new Error("Couldn't get secret scan results");
  }
  return {
    scanId: secretScanId,
    timestamp: secretScanResults.created_at,
    counts: secretScanResults.severity_counts ?? {},
  };
};

export const getVulnerabilityScanCounts = async (
  vulnerabilityScanId?: string,
): Promise<ScanSummary | null> => {
  if (!vulnerabilityScanId || !vulnerabilityScanId.length) {
    return null;
  }
  const vulnerabilityScanResults = await makeRequest({
    apiFunction: getVulnerabilityApiClient().resultVulnerabilityScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: vulnerabilityScanId,
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
      },
    ],
  });
  if (ApiError.isApiError(vulnerabilityScanResults)) {
    console.error(vulnerabilityScanResults);
    throw new Error("Couldn't get vulnerability scan results");
  }
  return {
    scanId: vulnerabilityScanId,
    timestamp: vulnerabilityScanResults.created_at,
    counts: vulnerabilityScanResults.severity_counts ?? {},
  };
};

export const getMalwareScanCounts = async (
  malwareScanId?: string,
): Promise<ScanSummary | null> => {
  if (!malwareScanId || !malwareScanId.length) {
    return null;
  }
  const malwareScanResults = await makeRequest({
    apiFunction: getMalwareApiClient().resultMalwareScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: malwareScanId,
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
      },
    ],
  });
  if (ApiError.isApiError(malwareScanResults)) {
    console.error(malwareScanResults);
    throw new Error("Couldn't get malware scan results");
  }
  return {
    scanId: malwareScanId,
    timestamp: malwareScanResults.created_at,
    counts: malwareScanResults.severity_counts ?? {},
  };
};

export const getComplianceScanCounts = async (
  complianceScanId?: string,
): Promise<ScanSummary | null> => {
  if (!complianceScanId || !complianceScanId.length) {
    return null;
  }
  const complianceScanResults = await makeRequest({
    apiFunction: getComplianceApiClient().resultComplianceScan,
    apiArgs: [
      {
        modelScanResultsReq: {
          scan_id: complianceScanId,
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
      },
    ],
  });
  if (ApiError.isApiError(complianceScanResults)) {
    console.error(complianceScanResults);
    throw new Error("Couldn't get posture scan results");
  }
  return {
    scanId: complianceScanId,
    timestamp: complianceScanResults.created_at,
    counts: complianceScanResults.status_counts ?? {},
  };
};
