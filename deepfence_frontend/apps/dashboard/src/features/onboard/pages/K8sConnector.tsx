import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { K8ConnectorForm } from '@/features/onboard/components/connectors/hosts/K8ConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

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
          Go Back
        </Button>
      </div>
    </div>
  );
};
