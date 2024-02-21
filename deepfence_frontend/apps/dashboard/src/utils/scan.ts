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
  if (
    !isScanComplete(status) &&
    !isScanFailed(status) &&
    !isNeverScanned(status) &&
    !isScanStopped(status) &&
    !isScanStopping(status) &&
    !isScanDeletePending(status)
  ) {
    return true;
  }
  return false;
};

export const isScanStopped = (status: string): boolean => {
  if (status.length && ScanStatusEnum.stopped === status) {
    return true;
  }
  return false;
};

export const isScanStopping = (status: string): boolean => {
  if (status.length && VULNERABILITY_SCAN_STATUS_GROUPS.cancelling.includes(status)) {
    return true;
  }
  return false;
};

export const isScanDeletePending = (status: string): boolean => {
  if (status.length && VULNERABILITY_SCAN_STATUS_GROUPS.deleting.includes(status)) {
    return true;
  }
  return false;
};

export const getScanLink = ({
  nodeType,
  scanType,
  scanId,
  cloudId,
  nodeId,
}: {
  nodeType: string;
  scanType: ScanTypeEnum;
  scanId: string;
  cloudId: string;
  nodeId: string;
}): string => {
  if (scanType === ScanTypeEnum.VulnerabilityScan) {
    return (
      generatePath('/vulnerability/scan-results/:scanId', {
        scanId: encodeURIComponent(scanId),
      }) + '?exploitable=most_exploitable'
    );
  } else if (scanType === ScanTypeEnum.SecretScan) {
    return (
      generatePath('/secret/scan-results/:scanId', {
        scanId: encodeURIComponent(scanId),
      }) + '?severity=critical&severity=high'
    );
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    return generatePath('/malware/scan-results/:scanId', {
      scanId: encodeURIComponent(scanId),
    });
  } else if (scanType === ScanTypeEnum.ComplianceScan) {
    return (
      generatePath('/posture/scan-results/:nodeType/:scanId', {
        scanId: encodeURIComponent(scanId),
        nodeType: nodeType === 'host' ? 'linux' : nodeType,
      }) + '?status=warn'
    );
  } else if (scanType === ScanTypeEnum.CloudComplianceScan) {
    return `${generatePath('/posture/cloud/scan-results/:nodeType/:scanId', {
      scanId: encodeURIComponent(scanId),
      nodeType: cloudId,
    })}?resources=${encodeURIComponent(nodeId)}&status=alarm`;
  }
  throw new Error('Invalid scan type');
};

export enum VulnerabilityScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
  'deleting' = 'deleting',
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
  cancelled: ['CANCELLED'],
  cancelling: ['CANCEL_PENDING', 'CANCELLING'],
  deleting: ['DELETE_PENDING'],
};

export enum SecretScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
  'deleting' = 'deleting',
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
  cancelled: ['CANCELLED'],
  cancelling: ['CANCEL_PENDING', 'CANCELLING'],
  deleting: ['DELETE_PENDING'],
};

export enum MalwareScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
  'deleting' = 'deleting',
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
  cancelled: ['CANCELLED'],
  cancelling: ['CANCEL_PENDING', 'CANCELLING'],
  deleting: ['DELETE_PENDING'],
};

export enum ComplianceScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
  'deleting' = 'deleting',
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
  cancelled: ['CANCELLED'],
  cancelling: ['CANCEL_PENDING', 'CANCELLING'],
  deleting: ['DELETE_PENDING'],
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
  {
    label: 'Cancelled',
    value: 'cancelled',
  },
  {
    label: 'Cancelling',
    value: 'cancelling',
  },
];
