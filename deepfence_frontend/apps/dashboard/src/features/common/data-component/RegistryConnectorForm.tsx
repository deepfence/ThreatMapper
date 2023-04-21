import { useEffect } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';
import { toast } from 'sonner';

import { getRegistriesApiClient } from '@/api/api';
import { ApiDocsBadRequestResponse, ModelRegistryAddReq } from '@/api/generated';
import { AmazonECRConnectorForm } from '@/components/registries-connector/AmazonECRConnectorForm';
import { AzureCRConnectorForm } from '@/components/registries-connector/AzureCRConnectorForm';
import { DockerConnectorForm as DockerRegistryConnectorForm } from '@/components/registries-connector/DockerConnectorForm';
import { DockerPriavateConnectorForm } from '@/components/registries-connector/DockerPrivateConnectorForm';
import { GitLabConnectorForm } from '@/components/registries-connector/GitLabConnectorForm';
import { GoogleCRConnectorForm } from '@/components/registries-connector/GoogleCRConnectorForm';
import { HarborConnectorForm } from '@/components/registries-connector/HarborConnectorForm';
import { JfrogConnectorForm } from '@/components/registries-connector/JfrogConnectorForm';
import { QuayConnectorForm } from '@/components/registries-connector/QuayConnectorForm';
import { RegistryType } from '@/types/common';
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

const getRequestBodyByRegistryType = (
  registryType: string,
  body: {
    [k: string]: FormDataEntryValue;
  },
): ModelRegistryAddReq => {
  let requestParams: ModelRegistryAddReq = {
    name: '',
    registry_type: '',
  };

  switch (registryType) {
    case RegistryType.docker_hub:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          docker_hub_namespace: body.namespace,
          docker_hub_username: body.username,
        },
        secret: {
          docker_hub_password: body.password,
        },
        registry_type: 'docker_hub',
      };
      break;
    case RegistryType.docker_private_registry:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          docker_registry_url: body.registryUrl,
          docker_username: body.username,
        },
        secret: {
          docker_password: body.password,
        },
        registry_type: 'docker_private_registry',
      };
      break;
    case RegistryType.harbor:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          harbor_registry_url: body.registryUrl,
          harbor_project_name: body.projectName,
          harbor_username: body.username,
        },
        secret: {
          harbor_password: body.password,
        },
        registry_type: 'harbor',
      };
      break;
    case RegistryType.quay:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          quay_registry_url: body.registryUrl,
          quay_namespace: body.namespace,
        },
        secret: {
          quay_access_token: body.accessToken,
        },
        registry_type: 'quay',
      };
      break;

    case RegistryType.gitlab:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          gitlab_registry_url: body.registryUrl,
          gitlab_server_url: body.serverUrl,
        },
        secret: {
          gitlab_access_token: body.accessToken,
        },
        registry_type: 'gitlab',
      };
      break;
    case RegistryType.jfrog_container_registry:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          jfrog_registry_url: body.registryUrl,
          jfrog_repository: body.repository,
          jfrog_username: body.username,
        },
        secret: {
          jfrog_password: body.password,
        },
        registry_type: 'jfrog_container_registry',
      };
      break;
    case RegistryType.azure_container_registry:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          azure_registry_url: body.registryUrl,
          azure_registry_username: body.username,
        },
        secret: {
          azure_registry_password: body.password,
        },
        registry_type: 'azure_container_registry',
      };
      break;
    case RegistryType.ecr:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          aws_region_name: body.awsRegion,
          ecr_registry_username: body.username,

          registry_id: body.awsSecretKey,
          use_iam_role: body.awsSecretKey,
          target_account_role_arn: body.awsSecretKey,
        },
        secret: {
          aws_access_key_id: body.awsAccessKey,
          aws_secret_access_key: body.awsSecretKey,
        },
        registry_type: 'ecr',
      };
      break;
    case RegistryType.google_container_registry:
      requestParams = {
        name: body.registryName.toString(),
        non_secret: {
          registry_url: body.registryUrl,
        },
        secret: {
          service_account_json: body.authFile,
        },
        registry_type: 'google_container_registry',
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

  const formBody = Object.fromEntries(formData);

  if (registryType === RegistryType.google_container_registry) {
    const r = await makeRequest({
      apiFunction: getRegistriesApiClient().addRegistryGCR,
      apiArgs: [
        {
          name: formBody.registryName.toString(),
          registryUrl: formBody.registryUrl.toString(),
          serviceAccountJson: formData.get('authFile') as Blob,
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
  } else {
    const r = await makeRequest({
      apiFunction: getRegistriesApiClient().addRegistry,
      apiArgs: [
        {
          modelRegistryAddReq: getRequestBodyByRegistryType(registryType, formBody),
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
    <fetcher.Form
      method="post"
      action={'/data-component/registries/add-connector'}
      encType="multipart/form-data"
    >
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
