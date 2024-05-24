import { TableNoDataElement } from 'ui-components';

import {
  ScanStatusDeletePending,
  ScanStatusInError,
  ScanStatusInProgress,
  ScanStatusStopped,
  ScanStatusStopping,
} from '@/components/ScanStatusMessage';
import {
  isScanDeletePending,
  isScanFailed,
  isScanInProgress,
  isScanStopped,
  isScanStopping,
} from '@/utils/scan';

export const TablePlaceholder = ({
  scanStatus,
  message,
}: {
  scanStatus: string;
  message: string;
}) => {
  if (isScanFailed(scanStatus)) {
    return (
      <div className="flex items-center justify-center min-h-[384px]">
        <ScanStatusInError errorMessage={message} />
      </div>
    );
  }
  if (isScanStopped(scanStatus)) {
    return (
      <div className="flex items-center justify-center h-[384px]">
        <ScanStatusStopped errorMessage={message ?? ''} />
      </div>
    );
  }
  if (isScanStopping(scanStatus)) {
    return (
      <div className="flex items-center justify-center h-[384px]">
        <ScanStatusStopping />
      </div>
    );
  }
  if (isScanInProgress(scanStatus)) {
    return (
      <div className="flex items-center justify-center min-h-[384px]">
        <ScanStatusInProgress />
      </div>
    );
  }

  if (isScanDeletePending(scanStatus)) {
    return (
      <div className="flex items-center justify-center min-h-[384px]">
        <ScanStatusDeletePending />
      </div>
    );
  }

  return <TableNoDataElement text="No data available" />;
};
