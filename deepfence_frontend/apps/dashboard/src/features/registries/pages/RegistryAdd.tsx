import { Form, useActionData, useParams } from 'react-router-dom';
import { Button } from 'ui-components';

import { DockerConnectionForm } from '@/features/onboard/components/connectors/registries/DockerConnectionForm';
import { action as dockerRegistryAction } from '@/features/onboard/pages/DockerRegistryConnector';

const RegistryAdd = () => {
  const actionData = useActionData() as { message: string };

  const params = useParams() as {
    account: string;
  };

  if (!params.account) {
    throw new Error('Account Type is required');
  }

  return (
    <Form method="post">
      <DockerConnectionForm errorMessage={actionData?.message ?? ''} />
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
