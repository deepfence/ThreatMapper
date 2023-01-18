import { Button } from 'ui-components';

import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { LinuxConnectorForm } from '@/features/onboard/components/connectors/hosts/LinuxConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const LinuxConnector = () => {
  const { goBack } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Connect a Linux VM"
        description="Deploy all modules for Deepfence Compliance Scanner at Linux VM."
      />
      <LinuxConnectorForm />

      <Button onClick={goBack} size="xs" className="mt-16" color="default">
        Cancel
      </Button>
    </div>
  );
};
