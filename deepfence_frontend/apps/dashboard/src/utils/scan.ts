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
    !isScanStopping(status)
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
    return generatePath('/vulnerability/scan-results/:scanId', {
      scanId: encodeURIComponent(scanId),
    });
  } else if (scanType === ScanTypeEnum.SecretScan) {
    return generatePath('/secret/scan-results/:scanId', {
      scanId: encodeURIComponent(scanId),
    });
  } else if (scanType === ScanTypeEnum.MalwareScan) {
    return generatePath('/malware/scan-results/:scanId', {
      scanId: encodeURIComponent(scanId),
    });
  } else if (scanType === ScanTypeEnum.ComplianceScan) {
    return generatePath('/posture/scan-results/:nodeType/:scanId', {
      scanId: encodeURIComponent(scanId),
      nodeType: nodeType === 'host' ? 'linux' : nodeType,
    });
  } else if (scanType === ScanTypeEnum.CloudComplianceScan) {
    return generatePath('/posture/cloud/scan-results/:nodeType/:scanId', {
      scanId: encodeURIComponent(scanId),
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
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
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
};

export enum SecretScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
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
};

export enum MalwareScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
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
};

export enum ComplianceScanGroupedStatus {
  'neverScanned' = 'neverScanned',
  'starting' = 'starting',
  'inProgress' = 'inProgress',
  'error' = 'error',
  'complete' = 'complete',
  'cancelled' = 'cancelled',
  'cancelling' = 'cancelling',
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
