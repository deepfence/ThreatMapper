import { generatePath } from 'react-router-dom';

import { ModelScanInfoStatusEnum } from '@/api/generated';
import { ScanTypeEnum } from '@/types/common';

export const isScanComplete = (status: string): boolean => {
  if (status.length && ModelScanInfoStatusEnum.Complete === status) {
    return true;
  }
  return false;
};

export const isScanFailed = (status: string): boolean => {
  if (status.length && ModelScanInfoStatusEnum.Error === status) {
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
  if (status.length && ModelScanInfoStatusEnum.Cancelled === status) {
    return true;
  }
  return false;
};

export const isScanStopping = (status: string): boolean => {
  if (status.length && SCAN_STATUS_GROUPS.Cancelling.includes(status)) {
    return true;
  }
  return false;
};

export const isScanDeletePending = (status: string): boolean => {
  if (status.length && SCAN_STATUS_GROUPS.Deleting.includes(status)) {
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

export const SCAN_STATUS_GROUPS: Record<SCAN_STATUS_FILTER_TYPE, Array<string>> = {
  'Never scanned': [
    ModelScanInfoStatusEnum.Complete,
    ModelScanInfoStatusEnum.Error,
    ModelScanInfoStatusEnum.InProgress,
    ModelScanInfoStatusEnum.Starting,
  ],
  Starting: [ModelScanInfoStatusEnum.Starting],
  'In progress': [ModelScanInfoStatusEnum.InProgress],
  Error: [ModelScanInfoStatusEnum.Error],
  Complete: [ModelScanInfoStatusEnum.Complete],
  Cancelled: [ModelScanInfoStatusEnum.Cancelled],
  Cancelling: [ModelScanInfoStatusEnum.CancelPending, ModelScanInfoStatusEnum.Cancelling],
  Deleting: [ModelScanInfoStatusEnum.DeletePending],
};

export type SCAN_STATUS_FILTER_TYPE = keyof typeof SCAN_STATUS_FILTER;
export const SCAN_STATUS_FILTER = {
  'Never scanned': 'Never scanned',
  Starting: 'Starting',
  'In progress': 'In progress',
  Error: 'Error',
  Complete: 'Complete',
  Cancelled: 'Cancelled',
  Cancelling: 'Cancelling',
  Deleting: 'Deleting',
} as const;
