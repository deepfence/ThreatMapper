import { Button } from 'ui-components';

import { AmazonECRConnectorForm } from '@/components/registries-connector/AmazonECRConnectorForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const AmazonECRConnector = () => {
  const { goBack, navigate } = usePageNavigation();
  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect Registry Amazon ECR"
        description="Deploy all modules for Deepfence Compliance Scanner for your registry"
      />
      <AmazonECRConnectorForm />
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
  );
};
