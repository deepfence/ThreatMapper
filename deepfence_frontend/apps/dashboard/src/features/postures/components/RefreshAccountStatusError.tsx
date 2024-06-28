import { Tooltip } from 'ui-components';

import { ErrorStandardSolidIcon } from '@/components/icons/common/ErrorStandardSolid';

export const RefreshAccountStatusError = ({ errorMessage }: { errorMessage: string }) => {
  return (
    <div className="flex items-center justify-center gap-x-2">
      <div className="flex flex-col text-h3 text-text-text-and-icon">Error</div>
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
    </div>
  );
};
