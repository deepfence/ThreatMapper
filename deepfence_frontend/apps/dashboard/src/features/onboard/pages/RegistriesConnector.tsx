import { useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

const RegistriesConnector = () => {
  const { registryType } = useParams() as {
    registryType: string;
  };
  const { goBack, navigate } = usePageNavigation();

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Docker Registry"
        description="Deploy all modules for Deepfence Compliance Scanner for your registry"
      />
      <>
        <RegistryConnectorForm
          onSuccess={() => {
            navigate('/onboard/connectors/my-connectors');
          }}
          registryType={registryType}
          renderButton={() => (
            <div className="flex">
              <Button onClick={goBack} size="xs">
                Go Back
              </Button>
              <div className="flex items-center ml-auto">
                <Button color="primary" size="xs" className="ml-auto" type="submit">
                  Save and go to connectors
                </Button>
              </div>
            </div>
          )}
        />
      </>
    </div>
  );
};

export const module = {
  element: <RegistriesConnector />,
};
