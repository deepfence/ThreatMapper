import { Button } from 'ui-components';

import { usePageNavigation } from '../../../utils/usePageNavigation';
import { ConnectorHeader } from '../components/ConnectorHeader';
import { AzureConnectorForm } from '../components/connectors/clouds/AzureConnectorForm';

export const AzureConnector = () => {
  const { goBack } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect Google Azure Account"
        description="Deploy all modules for Deepfence Compliance Scanner for your azure cloud account. For more information, see terraform Azure docs."
      />
      <AzureConnectorForm />
      <Button onClick={goBack} size="xs" className="mt-16" color="default">
        Cancel
      </Button>
    </div>
  );
};
