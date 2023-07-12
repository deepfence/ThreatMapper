import { useParams } from 'react-router-dom';
import { Button, Card } from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const RegistriesConnector = () => {
  const { connectorType } = useParams() as {
    connectorType: string;
  };
  const { goBack, navigate } = usePageNavigation();

  return (
    <div className="w-full">
      <Card className="p-4">
        <RegistryConnectorForm
          onSuccess={() => {
            navigate('/onboard/connectors/my-connectors');
          }}
          registryType={connectorType}
          renderButton={(state) => (
            <div className="flex mt-4 gap-x-2">
              <Button
                type="submit"
                disabled={state !== 'idle'}
                loading={state !== 'idle'}
              >
                Save and go to connectors
              </Button>
              <Button onClick={goBack} type="button" variant="outline">
                Cancel
              </Button>
            </div>
          )}
        />
      </Card>
    </div>
  );
};
