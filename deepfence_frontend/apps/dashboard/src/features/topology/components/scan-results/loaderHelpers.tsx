import {
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ScanSummary } from '@/features/topology/types/node-details';
import { apiWrapper } from '@/utils/api';

export const getSecretScanCounts = async (
  secretScanId?: string,
): Promise<ScanSummary | null> => {
  if (!secretScanId || !secretScanId.length) {
    return null;
  }
  const resultSecretScanApi = apiWrapper({
    fn: getSecretApiClient().resultSecretScan,
  });
  const secretScanResults = await resultSecretScanApi({
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
  });

  if (!secretScanResults.ok) {
    console.error(secretScanResults);
    throw new Error("Couldn't get secret scan results");
  }
  return {
    scanId: secretScanId,
    timestamp: secretScanResults.value.created_at,
    counts: secretScanResults.value.severity_counts ?? {},
  };
};

export const getVulnerabilityScanCounts = async (
  vulnerabilityScanId?: string,
): Promise<ScanSummary | null> => {
  if (!vulnerabilityScanId || !vulnerabilityScanId.length) {
    return null;
  }
  const resultVulnerabilityScanApi = apiWrapper({
    fn: getVulnerabilityApiClient().resultVulnerabilityScan,
  });
  const vulnerabilityScanResults = await resultVulnerabilityScanApi({
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
  });

  if (!vulnerabilityScanResults.ok) {
    console.error(vulnerabilityScanResults);
    throw new Error("Couldn't get vulnerability scan results");
  }
  return {
    scanId: vulnerabilityScanId,
    timestamp: vulnerabilityScanResults.value.created_at,
    counts: vulnerabilityScanResults.value.severity_counts ?? {},
  };
};

export const getMalwareScanCounts = async (
  malwareScanId?: string,
): Promise<ScanSummary | null> => {
  if (!malwareScanId || !malwareScanId.length) {
    return null;
  }
  const resultMalwareScanApi = apiWrapper({
    fn: getMalwareApiClient().resultMalwareScan,
  });
  const malwareScanResults = await resultMalwareScanApi({
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
  });

  if (!malwareScanResults.ok) {
    console.error(malwareScanResults);
    throw new Error("Couldn't get malware scan results");
  }
  return {
    scanId: malwareScanId,
    timestamp: malwareScanResults.value.created_at,
    counts: malwareScanResults.value.severity_counts ?? {},
  };
};

export const getComplianceScanCounts = async (
  complianceScanId?: string,
): Promise<ScanSummary | null> => {
  if (!complianceScanId || !complianceScanId.length) {
    return null;
  }
  const resultComplianceScanApi = apiWrapper({
    fn: getComplianceApiClient().resultComplianceScan,
  });
  const complianceScanResults = await resultComplianceScanApi({
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
  });

  if (!complianceScanResults.ok) {
    console.error(complianceScanResults);
    throw new Error("Couldn't get posture scan results");
  }
  return {
    scanId: complianceScanId,
    timestamp: complianceScanResults.value.created_at,
    counts: complianceScanResults.value.status_counts ?? {},
  };
};
