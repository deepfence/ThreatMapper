import { useRef } from 'react';
import { Button } from 'ui-components';

import {
  DockerConnectorForm as DockerRegistryConnectorForm,
  dockerRegistryConnectorApi,
} from '@/components/registries-connector/DockerConnectorForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { usePageNavigation } from '@/utils/usePageNavigation';

const DockerRegistryContainer = () => {
  const { goBack, navigate } = usePageNavigation();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Docker Registry"
        description="Deploy all modules for Deepfence Compliance Scanner for your registry"
      />
      <>
        <DockerRegistryConnectorForm
          ref={formRef}
          onSuccess={() => {
            navigate('/onboard/connectors/my-connectors');
          }}
        />
        <div className="flex">
          <Button onClick={goBack} size="xs">
            Go Back
          </Button>
          <div className="flex items-center ml-auto">
            <Button
              color="primary"
              size="xs"
              className="ml-auto"
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }}
            >
              Save and go to connectors
            </Button>
          </div>
        </div>
      </>
    </div>
  );
};

export const module = {
  action: dockerRegistryConnectorApi,
  element: <DockerRegistryContainer />,
};
