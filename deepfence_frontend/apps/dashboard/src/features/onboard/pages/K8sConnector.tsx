import { Button } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';
import { K8ConnectorForm } from '../components/connectors/hosts/K8ConnectorForm';

export const K8sConnector = () => {
  const { goBack } = usePageNavigation();

  return (
    <div>
      <ConnectorHeader
        title="Connect a Kubernetes Cluster"
        description="Deploy all modules for Deepfence Compliance Scanner at your kubernetes cluster."
      />
      <div className="flex gap-x-2 flex-col sm:flex-row flex-1">
        <K8ConnectorForm />
      </div>
      <div className="flex flex-row mt-16">
        <Button onClick={goBack} size="xs">
          Cancel
        </Button>
      </div>
    </div>
  );
};
