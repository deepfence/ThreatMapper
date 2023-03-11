import { Form, useActionData, useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { AmazonECRConnectorForm } from '@/components/registries-connector/AmazonECRConnectorForm';
import { AzureCRConnectorForm } from '@/components/registries-connector/AzureCRConnectorForm';
import { DockerConnectorForm } from '@/components/registries-connector/DockerConnectorForm';
import { DockerPriavateConnectorForm } from '@/components/registries-connector/DockerPrivateConnectorForm';
import { GitLabConnectorForm } from '@/components/registries-connector/GitLabConnectorForm';
import { GoogleCRConnectorForm } from '@/components/registries-connector/GoogleCRConnectorForm';
import { HarborConnectorForm } from '@/components/registries-connector/HarborConnectorForm';
import { JfrogConnectorForm } from '@/components/registries-connector/JfrogConnectorForm';
import { QuayConnectorForm } from '@/components/registries-connector/QuayConnectorForm';
import { action as dockerRegistryAction } from '@/features/onboard/pages/DockerRegistryConnector';

const RegistryAdd = () => {
  const actionData = useActionData() as { message: string };

  const { account } = useParams() as {
    account: string;
  };

  if (!account) {
    throw new Error('Account Type is required');
  }

  return (
    <Form method="post">
      {account === 'docker_hub' && (
        <DockerConnectorForm errorMessage={actionData?.message ?? ''} />
      )}
      {account === 'ecr' && <AmazonECRConnectorForm />}
      {account === 'azure' && <AzureCRConnectorForm />}
      {account === 'gcr' && <GoogleCRConnectorForm />}

      {account === 'dockerhub_private' && (
        <DockerPriavateConnectorForm errorMessage={actionData?.message ?? ''} />
      )}

      {account === 'harbor' && (
        <HarborConnectorForm errorMessage={actionData?.message ?? ''} />
      )}

      {account === 'gitlab' && (
        <GitLabConnectorForm errorMessage={actionData?.message ?? ''} />
      )}

      {account === 'jfrog' && (
        <JfrogConnectorForm errorMessage={actionData?.message ?? ''} />
      )}

      {account === 'quay' && (
        <QuayConnectorForm errorMessage={actionData?.message ?? ''} />
      )}

      <div className="flex ml-auto">
        <Button color="primary" size="xs" className="ml-auto" type="submit">
          Save information
        </Button>
      </div>
    </Form>
  );
};

export const module = {
  action: dockerRegistryAction,
  element: <RegistryAdd />,
};
