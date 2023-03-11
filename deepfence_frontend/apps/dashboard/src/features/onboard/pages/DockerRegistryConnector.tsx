import { ActionFunctionArgs, Form, redirect, useActionData } from 'react-router-dom';
import { Button } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { DockerConnectorForm } from '@/components/registries-connector/DockerConnectorForm';
import { ConnectorHeader } from '@/features/onboard/components/ConnectorHeader';
import { ApiError, makeRequest } from '@/utils/api';
import { usePageNavigation } from '@/utils/usePageNavigation';

type ActionReturnType = {
  message?: string;
};

export const action = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const body = Object.fromEntries(formData);

  const r = await makeRequest({
    apiFunction: getRegistriesApiClient().addRegistry,
    apiArgs: [
      {
        modelRegistryAddReq: {
          name: body.registryName as string,
          non_secret: {
            docker_hub_namespace: body.namespace,
            docker_hub_username: body.username,
          },
          secret: {
            docker_hub_password: body.password,
          },
          registry_type: 'docker_hub',
        },
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({});
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }

  throw redirect('/onboard/connectors/my-connectors');
};

const DockerRegistryContainer = () => {
  const { goBack } = usePageNavigation();
  const loaderData = useActionData() as { message: string };

  return (
    <div className="w-full">
      <ConnectorHeader
        title="Docker Registry"
        description="Deploy all modules for Deepfence Compliance Scanner for your registry"
      />
      <Form method="post">
        <DockerConnectorForm errorMessage={loaderData?.message ?? ''} />
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
      </Form>
    </div>
  );
};

export const module = {
  action,
  element: <DockerRegistryContainer />,
};
