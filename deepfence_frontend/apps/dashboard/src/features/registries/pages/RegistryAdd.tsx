import { useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { AmazonECRConnectorForm } from '@/components/registries-connector/AmazonECRConnectorForm';
import { AzureCRConnectorForm } from '@/components/registries-connector/AzureCRConnectorForm';
import { DockerConnectorForm as DockerRegistryConnectorForm } from '@/components/registries-connector/DockerConnectorForm';
import { DockerPriavateConnectorForm } from '@/components/registries-connector/DockerPrivateConnectorForm';
import { GitLabConnectorForm } from '@/components/registries-connector/GitLabConnectorForm';
import { GoogleCRConnectorForm } from '@/components/registries-connector/GoogleCRConnectorForm';
import { HarborConnectorForm } from '@/components/registries-connector/HarborConnectorForm';
import { JfrogConnectorForm } from '@/components/registries-connector/JfrogConnectorForm';
import { QuayConnectorForm } from '@/components/registries-connector/QuayConnectorForm';

const RegistryAdd = () => {
  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <>
      {account === 'docker_hub' && <DockerRegistryConnectorForm />}
      {account === 'ecr' && <AmazonECRConnectorForm />}
      {account === 'azure' && <AzureCRConnectorForm />}
      {account === 'gcr' && <GoogleCRConnectorForm />}

      {account === 'dockerhub_private' && <DockerPriavateConnectorForm />}

      {account === 'harbor' && <HarborConnectorForm />}

      {account === 'gitlab' && <GitLabConnectorForm />}

      {account === 'jfrog' && <JfrogConnectorForm />}

      {account === 'quay' && <QuayConnectorForm />}

      <div className="flex ml-auto">
        <Button color="primary" size="xs" className="ml-auto" type="submit">
          Save information
        </Button>
      </div>
    </>
  );
};

export const module = {
  element: <RegistryAdd />,
};
