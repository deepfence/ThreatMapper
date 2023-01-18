import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { GCPConnectorForm } from '@/features/onboard/components/connectors/clouds/GCPConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const GCPConnector = () => {
  const { goBack } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect Google Cloud Platform"
        description="Deploy all modules for Deepfence Compliance Scanner for your google cloud account. For more information, see terraform google cloud docs."
      />
      <GCPConnectorForm />

      <Button onClick={goBack} size="xs" className="mt-16" color="default">
        Cancel
      </Button>
    </div>
  );
};
