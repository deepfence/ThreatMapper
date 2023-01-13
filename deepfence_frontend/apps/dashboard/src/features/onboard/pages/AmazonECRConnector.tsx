import { Button } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';
import { AmazonECRConnectorForm } from '../components/connectors/registries/AmazonECRConnectionForm';

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
          Cancel
        </Button>
      </div>
    </div>
  );
};
