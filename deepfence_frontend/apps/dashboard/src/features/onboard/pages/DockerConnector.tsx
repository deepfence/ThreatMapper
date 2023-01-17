import { Button } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';
import { DockerConnectorForm } from '../components/connectors/hosts/DockerConnectorForm';

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
        Cancel
      </Button>
    </div>
  );
};
