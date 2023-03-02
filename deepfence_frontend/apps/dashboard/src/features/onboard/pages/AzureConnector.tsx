import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { AzureConnectorForm } from '@/features/onboard/components/connectors/clouds/AzureConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const AzureConnector = () => {
  const { goBack, navigate } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect Google Azure Account"
        description="Deploy all modules for Deepfence Compliance Scanner for your azure cloud account. For more information, see terraform Azure docs."
      />
      <AzureConnectorForm />
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
