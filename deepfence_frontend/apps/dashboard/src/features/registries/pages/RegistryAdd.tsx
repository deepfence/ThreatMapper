import { useRef } from 'react';
import { generatePath, useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { AmazonECRConnectorForm } from '@/components/registries-connector/AmazonECRConnectorForm';
import { AzureCRConnectorForm } from '@/components/registries-connector/AzureCRConnectorForm';
import {
  DockerConnectorForm as DockerRegistryConnectorForm,
  dockerRegistryConnectorApi,
} from '@/components/registries-connector/DockerConnectorForm';
import { DockerPriavateConnectorForm } from '@/components/registries-connector/DockerPrivateConnectorForm';
import { GitLabConnectorForm } from '@/components/registries-connector/GitLabConnectorForm';
import { GoogleCRConnectorForm } from '@/components/registries-connector/GoogleCRConnectorForm';
import { HarborConnectorForm } from '@/components/registries-connector/HarborConnectorForm';
import { JfrogConnectorForm } from '@/components/registries-connector/JfrogConnectorForm';
import { QuayConnectorForm } from '@/components/registries-connector/QuayConnectorForm';
import { usePageNavigation } from '@/utils/usePageNavigation';

const RegistryAdd = () => {
  const { navigate } = usePageNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      {account === 'docker_hub' && (
        <DockerRegistryConnectorForm
          ref={formRef}
          onSuccess={() => {
            navigate(
              generatePath('/registries/:account', {
                account,
              }),
            );
          }}
        />
      )}
      {account === 'ecr' && <AmazonECRConnectorForm />}
      {account === 'azure' && <AzureCRConnectorForm />}
      {account === 'gcr' && <GoogleCRConnectorForm />}

      {account === 'dockerhub_private' && <DockerPriavateConnectorForm />}

      {account === 'harbor' && <HarborConnectorForm />}

      {account === 'gitlab' && <GitLabConnectorForm />}

      {account === 'jfrog' && <JfrogConnectorForm />}

      {account === 'quay' && <QuayConnectorForm />}

      <div className="flex ml-auto">
        <Button
          color="primary"
          size="xs"
          className="ml-auto"
          type="submit"
          onClick={(e) => {
            e.preventDefault();
            console.log('', formRef.current);
            formRef.current?.requestSubmit();
          }}
        >
          Save information
        </Button>
      </div>
    </>
  );
};

export const module = {
  action: dockerRegistryConnectorApi,
  element: <RegistryAdd />,
};
