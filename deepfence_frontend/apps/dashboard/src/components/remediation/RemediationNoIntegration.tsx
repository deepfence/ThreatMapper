import { Button } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';

export const RemediationNoIntegration = ({
  onBackButtonClick,
}: {
  onBackButtonClick?: () => void;
}) => {
  return (
    <div className="mt-16 px-5">
      <div className="h-10 w-10 mx-auto">
        <ErrorStandardLineIcon />
      </div>
      <div className="text-center text-xl mt-4">
        No Generative AI integrations configured
      </div>
      <div className="text-center text-p2 mt-2">
        Please go to{' '}
        <DFLink to="/integrations/gen-ai/add">Add Generative AI integrations</DFLink> page
        to add one now!
      </div>
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
