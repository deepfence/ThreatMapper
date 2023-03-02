import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { K8ConnectorForm } from '@/features/onboard/components/connectors/hosts/K8ConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const K8sConnector = () => {
  const { goBack, navigate } = usePageNavigation();

  return (
    <div>
      <ConnectorHeader
        title="Connect a Kubernetes Cluster"
        description="Deploy all modules for Deepfence Compliance Scanner at your kubernetes cluster."
      />
      <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
        <K8ConnectorForm />
      </div>
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
