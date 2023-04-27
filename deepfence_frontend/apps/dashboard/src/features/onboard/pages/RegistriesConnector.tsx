import { useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const RegistriesConnector = () => {
  const { connectorType } = useParams() as {
    connectorType: string;
  };
  const { goBack, navigate } = usePageNavigation();

  return (
    <div className="w-full">
      <>
        <RegistryConnectorForm
          onSuccess={() => {
            navigate('/onboard/connectors/my-connectors');
          }}
          registryType={connectorType}
          renderButton={() => (
            <div className="flex">
              <Button onClick={goBack} size="xs" type="button">
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
