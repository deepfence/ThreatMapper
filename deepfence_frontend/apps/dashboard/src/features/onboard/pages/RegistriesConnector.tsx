import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button, Card } from 'ui-components';

import { RegistryConnectorForm } from '@/features/common/data-component/RegistryConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

export const RegistriesConnector = () => {
  const { connectorType } = useParams() as {
    connectorType: string;
  };
  const { goBack, navigate } = usePageNavigation();
  const [state, setState] = useState<'submitting' | 'idle' | 'loading'>('idle');

  return (
    <div className="w-full">
      <RegistryConnectorForm
        onSuccess={() => {
          toast.success('Added successfully');
          navigate('/onboard/connectors/my-connectors');
        }}
        registryType={connectorType}
        renderButton={(state) => {
          setState(state);
          return <></>;
        }}
      />
      <div className="mt-8 flex items-center sticky bottom-0 py-4 bg-bg-page gap-x-2">
        <Button
          size="md"
          type="submit"
          disabled={state !== 'idle'}
          loading={state !== 'idle'}
          form="registryConnectorForm"
        >
          Save and go to connectors
        </Button>
        <Button onClick={goBack} type="button" variant="outline" size="md">
          Cancel
        </Button>
      </div>
    </div>
  );
};
