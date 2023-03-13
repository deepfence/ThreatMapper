import { forwardRef } from 'react';
import { HiViewGridAdd } from 'react-icons/hi';
import { ActionFunctionArgs, Form, redirect, useActionData } from 'react-router-dom';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { ApiError, makeRequest } from '@/utils/api';

type ActionReturnType = {
  message?: string;
};

export const dockerRegistryConnectorApi = async ({
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

export const DockerConnectorForm = forwardRef<HTMLFormElement>((_, ref) => {
  const actionData = useActionData() as {
    message?: string;
  };

  return (
    <Form method="post" ref={ref}>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Container Registry">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Connect to your Docker Registry by{' '}
            <a
              href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-500 mt-2"
            >
              reading our documentation
            </a>
            .
          </div>
        </Step>
        <Step indicator="1" title="Enter Information">
          <Card className="w-full relative p-5 mt-2 flex flex-col gap-y-4">
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Registry Name"
              type={'text'}
              sizing="sm"
              name="registryName"
              placeholder="Registry Name"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Namespace"
              type={'text'}
              sizing="sm"
              name="namespace"
              placeholder="Namespace"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Username"
              type={'text'}
              sizing="sm"
              name="username"
              placeholder="Username"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Password"
              type={'password'}
              sizing="sm"
              name="password"
              placeholder="••••••••"
            />
          </Card>
        </Step>
      </Stepper>
      {actionData?.message && (
        <p className="text-red-500 text-sm ml-14 mb-6">{actionData.message}</p>
      )}
    </Form>
  );
});
