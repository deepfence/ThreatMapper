import { ScanStatusEnum } from '@/types/common';

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
