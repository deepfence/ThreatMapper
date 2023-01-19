import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { AmazonECRConnectorForm } from '@/features/onboard/components/connectors/registries/AmazonECRConnectionForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const AmazonECRConnector = () => {
  const { goBack } = usePageNavigation();
  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect Registry Amazon ECR"
        description="Deploy all modules for Deepfence Compliance Scanner for your registry"
      />
      <AmazonECRConnectorForm />
      <div className="flex mt-16">
        <Button onClick={goBack} size="xs">
          Go Back
        </Button>
      </div>
    </div>
  );
};
