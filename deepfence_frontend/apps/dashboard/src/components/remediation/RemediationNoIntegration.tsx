import { Button } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { ArrowLine } from '@/components/icons/common/ArrowLine';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { useAddBedrockIntegration } from '@/features/integrations/pages/AIIntegrationAdd';

export const RemediationNoIntegration = ({
  onBackButtonClick,
}: {
  onBackButtonClick?: () => void;
}) => {
  const { add, data, state } = useAddBedrockIntegration();

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
      {state === 'idle' && !data && (
        <div className="text-center text-p2 mt-2 px-6">
          If the management console is deployed in AWS with instance role and read
          permission to Amazon Bedrock, please{' '}
          <button
            type="button"
            className="text-text-link hover:underline focus:underline"
            onClick={(e) => {
              e.preventDefault();
              add();
            }}
          >
            click here
          </button>{' '}
          to automatically add integrations.
        </div>
      )}
      {state === 'idle' && data?.success === false && (
        <div className="text-center text-p2 mt-2 px-6 text-status-error">
          {data.message ?? "Couldn't add integration."}
        </div>
      )}
      {state === 'idle' && data?.success && (
        <div className="text-center text-p2 mt-2 px-6 text-status-success">
          {data.successMessage ?? 'Integration added successfully.'}
        </div>
      )}
      {state === 'submitting' && (
        <div className="text-center text-p2 mt-2 px-6">Adding integration...</div>
      )}

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
