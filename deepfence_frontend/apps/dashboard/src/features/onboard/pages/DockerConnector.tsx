import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { DockerConnectorForm } from '@/features/onboard/components/connectors/hosts/DockerConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const DockerConnector = () => {
  const { goBack } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect a Docker Container"
        description="Deploy all modules for Deepfence Compliance Scanner at your docker container."
      />
      <DockerConnectorForm />

      <Button onClick={goBack} size="xs" className="mt-16" color="default">
        Go Back
      </Button>
    </div>
  );
};
