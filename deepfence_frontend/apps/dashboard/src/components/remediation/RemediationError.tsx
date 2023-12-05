import { Button } from 'ui-components';

import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';

export const RemediationError = ({
  errorMessage,
  onBackButtonClick,
}: {
  errorMessage: string;
  onBackButtonClick?: () => void;
}) => {
  return (
    <div className="mt-8 px-5 dark:text-status-error">
      <div className="h-10 w-10 mx-auto">
        <ErrorStandardLineIcon />
      </div>
      <div className="text-center text-xl mt-4">{errorMessage}</div>
      {onBackButtonClick && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            startIcon={
              <div className="-rotate-90">
                <ArrowLine />
              </div>
            }
            type="button"
            onClick={() => {
              onBackButtonClick();
            }}
          >
            Go back
          </Button>
        </div>
      )}
    </div>
  );
};
