import { capitalize } from 'lodash-es';
import { cn } from 'tailwind-preset';
import { CircleSpinner } from 'ui-components';

import {
  ErrorIcon,
  NotStartedIcon,
  SuccessIcon,
} from '@/components/icons/common/ScanStatuses';
import { TruncatedText } from '@/components/TruncatedText';
import {
  isNeverScanned,
  isScanComplete,
  isScanFailed,
  isScanInProgress,
  isScanStopped,
  isScanStopping,
} from '@/utils/scan';

export const ScanStatusBadge = ({
  status,
  className,
  justIcon = false,
}: {
  status: string;
  className?: string;
  justIcon?: boolean;
}) => {
  const wrapperClassName = cn(
    'flex items-center gap-1.5 dark:text-text-text-and-icon text-p4',
    className,
  );

  const iconWrapper = cn('w-[18px] h-[18px] shrink-0');

  const scanStatus = capitalize(status.replaceAll('_', ' '));

  if (isScanComplete(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={iconWrapper}>
          <SuccessIcon />
        </span>

        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  } else if (isScanFailed(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={cn(iconWrapper, 'dark:text-status-error')}>
          <ErrorIcon />
        </span>
        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  } else if (isNeverScanned(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={iconWrapper}>
          <NotStartedIcon />
        </span>
        <TruncatedText text={'Never Scanned'} />
      </div>
    );
  } else if (isScanInProgress(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={iconWrapper}>
          <CircleSpinner size="sm" />
        </span>
        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  } else if (isScanStopping(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={iconWrapper}>
          <CircleSpinner size="sm" />
        </span>

        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  } else if (isScanStopped(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={cn(iconWrapper, 'dark:text-df-gray-500')}>
          <ErrorIcon />
        </span>

        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  }
  return null;
};
