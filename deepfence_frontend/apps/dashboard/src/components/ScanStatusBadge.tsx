import { capitalize } from 'lodash-es';
import { cn } from 'tailwind-preset';
import { CircleSpinner, Tooltip } from 'ui-components';

import {
  ErrorIcon,
  NotStartedIcon,
  SuccessIcon,
} from '@/components/icons/common/ScanStatuses';
import { TruncatedText } from '@/components/TruncatedText';
import {
  isNeverScanned,
  isScanComplete,
  isScanDeletePending,
  isScanFailed,
  isScanInProgress,
  isScanStopped,
  isScanStopping,
} from '@/utils/scan';

export const ScanStatusBadge = ({
  status,
  className,
  justIcon = false,
  errorMessage,
}: {
  status: string;
  className?: string;
  justIcon?: boolean;
  errorMessage?: string;
}) => {
  const wrapperClassName = cn(
    'flex items-center gap-1.5 text-text-text-and-icon text-p4a',
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
        {errorMessage ? (
          <Tooltip content={errorMessage}>
            <div className="flex items-center gap-x-1.5">
              <span className={cn(iconWrapper, 'text-status-error')}>
                <ErrorIcon />
              </span>
              {!justIcon ? <TruncatedText text={scanStatus} /> : null}
            </div>
          </Tooltip>
        ) : (
          <>
            <span className={cn(iconWrapper, 'text-status-error')}>
              <ErrorIcon />
            </span>
            {!justIcon ? <TruncatedText text={scanStatus} /> : null}
          </>
        )}
      </div>
    );
  } else if (isNeverScanned(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={cn(iconWrapper, 'text-severity-unknown')}>
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
        <span className={cn(iconWrapper, 'dark:text-df-gray-500 text-df-gray-400')}>
          <ErrorIcon />
        </span>

        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  } else if (isScanDeletePending(status)) {
    return (
      <div className={wrapperClassName}>
        <span className={iconWrapper}>
          <CircleSpinner size="sm" />
        </span>
        {!justIcon ? <TruncatedText text={scanStatus} /> : null}
      </div>
    );
  }
  return null;
};
