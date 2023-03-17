import { useEffect } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse } from '@/api/generated';
import { AmazonECRConnectorForm } from '@/components/registries-connector/AmazonECRConnectorForm';
import { AzureCRConnectorForm } from '@/components/registries-connector/AzureCRConnectorForm';
import { DockerConnectorForm as DockerRegistryConnectorForm } from '@/components/registries-connector/DockerConnectorForm';
import { DockerPriavateConnectorForm } from '@/components/registries-connector/DockerPrivateConnectorForm';
import { GitLabConnectorForm } from '@/components/registries-connector/GitLabConnectorForm';
import { GoogleCRConnectorForm } from '@/components/registries-connector/GoogleCRConnectorForm';
import { HarborConnectorForm } from '@/components/registries-connector/HarborConnectorForm';
import { JfrogConnectorForm } from '@/components/registries-connector/JfrogConnectorForm';
import { QuayConnectorForm } from '@/components/registries-connector/QuayConnectorForm';
import { ApiError, makeRequest } from '@/utils/api';

export const RegistryType = {
  azure_container_registry: 'azure_container_registry',
  docker_hub: 'docker_hub',
  docker_private_registry: 'docker_private_registry',
  ecr: 'ecr',
  gitlab: 'gitlab',
  google_container_registry: 'google_container_registry',
  harbor: 'harbor',
  jfrog_container_registry: 'jfrog_container_registry',
  quay: 'quay',
} as const;

type ActionReturnType = {
  message?: string;
  success: boolean;
};

type FormProps = {
  onSuccess: () => void;
  renderButton: () => JSX.Element;
  registryType: string;
};

const getRequestBodyByRegistryType = (registryType: string, formData: FormData) => {
  const body = Object.fromEntries(formData);
  let requestParams = {};

  switch (registryType) {
    case RegistryType.docker_hub:
      requestParams = {
        name: body.registryName,
        non_secret: {
          docker_hub_namespace: body.namespace,
          docker_hub_username: body.username,
        },
        secret: {
          docker_hub_password: body.password,
        },
        registry_type: registryType,
      };
      break;

    default:
      break;
  }
  return requestParams;
};

export const registryConnectorActionApi = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const registryType = formData.get('registryType')?.toString();

  if (!registryType) {
    throw new Error('Registry Type is required');
  }
  const r = await makeRequest({
    apiFunction: getRegistriesApiClient().addRegistry,
    apiArgs: [
      {
        modelRegistryAddReq: getRequestBodyByRegistryType(registryType, formData),
      },
    ],
    errorHandler: async (r) => {
      const error = new ApiError<ActionReturnType>({
        success: false,
      });
      if (r.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse = await r.json();
        return error.set({
          message: modelResponse.message ?? '',
          success: false,
        });
      }
    },
  });

  if (ApiError.isApiError(r)) {
    return r.value();
  }
  toast('Registry added successfully');
  return {
    success: true,
  };
};

export const RegistryConnectorForm = ({
  onSuccess,
  renderButton,
  registryType,
}: FormProps) => {
  const fetcher = useFetcher<ActionReturnType>();

  useEffect(() => {
    if (fetcher?.data?.success) {
      onSuccess();
    }
  }, [fetcher]);

  return (
    <fetcher.Form method="post" action={'/data-component/registries/add-connector'}>
      {registryType === RegistryType.docker_hub && (
        <DockerRegistryConnectorForm errorMessage={fetcher?.data?.message ?? ''} />
      )}

      {registryType === RegistryType.ecr && <AmazonECRConnectorForm />}
      {registryType === RegistryType.azure_container_registry && <AzureCRConnectorForm />}
      {registryType === RegistryType.google_container_registry && (
        <GoogleCRConnectorForm />
      )}

      {registryType === RegistryType.docker_private_registry && (
        <DockerPriavateConnectorForm />
      )}

      {registryType === RegistryType.harbor && <HarborConnectorForm />}

      {registryType === RegistryType.gitlab && <GitLabConnectorForm />}

      {registryType === RegistryType.jfrog_container_registry && <JfrogConnectorForm />}

      {registryType === RegistryType.quay && <QuayConnectorForm />}

      <input type="text" name="registryType" hidden readOnly value={registryType} />
      {renderButton()}
    </fetcher.Form>
  );
};
