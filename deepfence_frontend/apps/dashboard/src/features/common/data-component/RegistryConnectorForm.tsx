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

type ActionReturnType = {
  message?: string;
  success: boolean;
};

type FormProps = {
  onSuccess: () => void;
  renderButton: () => JSX.Element;
  registryType: string;
};

const REGISTRY_TYPE = {
  ECR: 'ecr',
  AZURE: 'azure',
  GCR: 'gcr',
  DOCKER_PRIVATE: 'dockerhub_private',
  HARBOR: 'harbor',
  GITLAB: 'gitlab',
  JFROG: 'jfrog',
  QUAY: 'quay',
  DOCKER_HUB: 'docker_hub',
};

const getRequestBodyByRegistryType = (registryType: string, formData: FormData) => {
  const body = Object.fromEntries(formData);
  let requestParams = {};

  switch (registryType) {
    case REGISTRY_TYPE.DOCKER_HUB:
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
      {registryType === REGISTRY_TYPE.DOCKER_HUB && (
        <DockerRegistryConnectorForm errorMessage={fetcher?.data?.message ?? ''} />
      )}
      {registryType === REGISTRY_TYPE.ECR && <AmazonECRConnectorForm />}
      {registryType === REGISTRY_TYPE.AZURE && <AzureCRConnectorForm />}
      {registryType === REGISTRY_TYPE.GCR && <GoogleCRConnectorForm />}

      {registryType === REGISTRY_TYPE.DOCKER_PRIVATE && <DockerPriavateConnectorForm />}

      {registryType === REGISTRY_TYPE.HARBOR && <HarborConnectorForm />}

      {registryType === REGISTRY_TYPE.GITLAB && <GitLabConnectorForm />}

      {registryType === REGISTRY_TYPE.JFROG && <JfrogConnectorForm />}

      {registryType === REGISTRY_TYPE.QUAY && <QuayConnectorForm />}

      <input type="text" name="registryType" hidden readOnly value={registryType} />
      {renderButton()}
    </fetcher.Form>
  );
};
