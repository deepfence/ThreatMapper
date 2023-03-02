import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { GCPConnectorForm } from '@/features/onboard/components/connectors/clouds/GCPConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const GCPConnector = () => {
  const { goBack, navigate } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect Google Cloud Platform"
        description="Deploy all modules for Deepfence Compliance Scanner for your google cloud account. For more information, see terraform google cloud docs."
      />
      <GCPConnectorForm />

      <div className="flex flex-col gap-y-4">
        <p className="text-xs ml-auto">
          Note: After successfully run the commands above, your connector will appear on
          MyConnector page, then you can perform scanning.
        </p>
        <div className="flex">
          <Button onClick={goBack} size="xs" color="default">
            Go Back
          </Button>
          <Button
            size="xs"
            color="primary"
            className="ml-auto"
            onClick={() => {
              navigate('/onboard/connectors/my-connectors');
            }}
          >
            Go to connectors
          </Button>
        </div>
      </div>
    </div>
  );
};
