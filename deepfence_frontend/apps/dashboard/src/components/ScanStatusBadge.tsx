import { capitalize } from 'lodash-es';
import { cn } from 'tailwind-preset';
import { CircleSpinner } from 'ui-components';

import {
  ErrorIcon,
  NotStartedIcon,
  SuccessIcon,
} from '@/components/icons/common/ScanStatuses';
import {
  isNeverScanned,
  isScanComplete,
  isScanFailed,
  isScanInProgress,
} from '@/utils/scan';

export const ScanStatusBadge = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => {
  const wrapperClassName = cn(
    'flex items-center gap-1.5 dark:text-text-text-and-icon text-p4',
    className,
  );

  const scanStatus = capitalize(status.replaceAll('_', ' '));

  if (isScanComplete(status)) {
    return (
      <div className={wrapperClassName}>
        <SuccessIcon />
        {scanStatus}
      </div>
    );
  } else if (isScanFailed(status)) {
    return (
      <div className={wrapperClassName}>
        <ErrorIcon /> {scanStatus}
      </div>
    );
  } else if (isNeverScanned(status)) {
    return (
      <div className={wrapperClassName}>
        <NotStartedIcon /> Never Scanned
      </div>
    );
  } else if (isScanInProgress(status)) {
    return (
      <div className={wrapperClassName}>
        <CircleSpinner size="sm" /> {scanStatus}
      </div>
    );
  }
  return null;
};
