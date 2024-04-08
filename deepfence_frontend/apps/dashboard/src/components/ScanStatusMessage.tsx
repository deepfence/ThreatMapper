import { CircleSpinner, Tooltip } from 'ui-components';

import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';

export const ScanStatusInProgress = () => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      <CircleSpinner size="md" />
      <span className="text-h3 font-medium text-text-text-and-icon">
        Scan is in progress, please wait...
      </span>
    </div>
  );
};

export const ScanStatusStopping = () => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      <CircleSpinner size="md" />
      <span className="text-h3 font-medium text-text-text-and-icon">Scan cancelling</span>
    </div>
  );
};

export const ScanStatusInError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      {errorMessage ? (
        <Tooltip content={errorMessage}>
          <div className="w-6 h-6 text-status-error rounded-full">
            <ErrorStandardSolidIcon />
          </div>
        </Tooltip>
      ) : (
        <div className="w-6 h-6 text-status-error rounded-full">
          <ErrorStandardSolidIcon />
        </div>
      )}

      <div className="flex flex-col text-h3 text-text-text-and-icon">Scan failed</div>
    </div>
  );
};

export const ScanStatusStopped = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      {errorMessage ? (
        <Tooltip content={errorMessage}>
          <div className="w-6 h-6 dark:text-df-gray-500  rounded-full">
            <ErrorStandardSolidIcon />
          </div>
        </Tooltip>
      ) : (
        <div className="w-6 h-6 dark:text-df-gray-500  rounded-full">
          <ErrorStandardSolidIcon />
        </div>
      )}

      <div className="flex flex-col text-h3 text-text-text-and-icon">Scan cancelled</div>
    </div>
  );
};

export const ScanStatusDeletePending = () => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      <CircleSpinner size="md" />
      <span className="text-h3 font-medium dark:text-text-text-and-icon">
        Scan delete pending
      </span>
    </div>
  );
};

export const ScanStatusNoData = ({ message }: { message?: string }) => {
  return (
    <div className="flex-1 flex gap-2 items-center justify-center p-6 text-text-text-and-icon">
      <div className="h-6 w-6 shrink-0">
        <ErrorStandardLineIcon />
      </div>
      <div className="text-h3">{message ?? 'No data available'}</div>
    </div>
  );
};
