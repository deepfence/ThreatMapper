import { generatePath } from 'react-router-dom';

import { ScanStatusEnum, ScanTypeEnum } from '@/types/common';

export const isScanComplete = (status: string): boolean => {
  if (status.length && ScanStatusEnum.complete === status) {
    return true;
  }
  return false;
};

export const isScanFailed = (status: string): boolean => {
  if (status.length && ScanStatusEnum.error === status) {
    return true;
  }
  return false;
};

export const isNeverScanned = (status: string): boolean => {
  if (!status?.length) {
    return true;
  }
  return false;
};

export const isScanInProgress = (status: string): boolean => {
  if (!isScanComplete(status) && !isScanFailed(status) && !isNeverScanned(status)) {
    return true;
  }
  return false;
};

export const getScanLink = ({
  nodeType,
  scanType,
  scanId,
}: {
  nodeType: string;
  scanType: ScanTypeEnum;
  scanId: string;
}): string => {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return generatePath('/vulnerability/scan-results/:scanId', { scanId });
  } else if (scanType === ScanTypeEnum.SecretScan) {
    return generatePath('/secret/scan-results/:scanId', { scanId });
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    return generatePath('/malware/scan-results/:scanId', { scanId });
  } else if (scanType === ScanTypeEnum.ComplianceScan) {
    // TODO fix compliance scan link
    return generatePath('/posture/scan-results/:nodeType/:scanId', { scanId, nodeType });
  } else if (scanType === ScanTypeEnum.CloudComplianceScan) {
    // TODO fix compliance scan link
    return generatePath('/posture/cloud/scan-results/:nodeType/:scanId', {
      scanId,
      nodeType,
    });
  }
  throw new Error('Invalid scan type');
};

export enum VulnerabilityScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
}

export const VULNERABILITY_SCAN_STATUS_GROUPS: Record<
  VulnerabilityScanGroupedStatus,
  Array<string>
> = {
  neverScanned: ['NEVER_SCANNED'],
  starting: ['STARTING'],
  inProgress: ['IN_PROGRESS', 'GENERATING_SBOM', 'GENERATED_SBOM', 'SCAN_IN_PROGRESS'],
  error: ['ERROR'],
  complete: ['COMPLETE'],
};

export enum SecretScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
}

export const SECRET_SCAN_STATUS_GROUPS: Record<
  VulnerabilityScanGroupedStatus,
  Array<string>
> = {
  neverScanned: ['NEVER_SCANNED'],
  starting: ['STARTING'],
  inProgress: ['IN_PROGRESS'],
  error: ['ERROR'],
  complete: ['COMPLETE'],
};

export enum MalwareScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
}

export const MALWARE_SCAN_STATUS_GROUPS: Record<
  VulnerabilityScanGroupedStatus,
  Array<string>
> = {
  neverScanned: ['NEVER_SCANNED'],
  starting: ['STARTING'],
  inProgress: ['IN_PROGRESS'],
  error: ['ERROR'],
  complete: ['COMPLETE'],
};

export enum ComplianceScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
}

export const COMPLIANCE_SCAN_STATUS_GROUPS: Record<
  VulnerabilityScanGroupedStatus,
  Array<string>
> = {
  neverScanned: ['NEVER_SCANNED'],
  starting: ['STARTING'],
  inProgress: ['IN_PROGRESS', 'SCAN_IN_PROGRESS'],
  error: ['ERROR'],
  complete: ['COMPLETE'],
};

export const SCAN_STATUS_GROUPS = [
  {
    label: 'Never scanned',
    value: 'neverScanned',
  },
  {
    label: 'Starting',
    value: 'starting',
  },
  {
    label: 'In progress',
    value: 'inProgress',
  },
  {
    label: 'Error',
    value: 'error',
  },
  {
    label: 'Complete',
    value: 'complete',
  },
];
