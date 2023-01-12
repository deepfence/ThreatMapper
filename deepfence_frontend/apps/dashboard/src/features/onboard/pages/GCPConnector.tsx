import { Button } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';
import { GCPConnectorForm } from '../components/connectors/clouds/GCPConnectorForm';

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
