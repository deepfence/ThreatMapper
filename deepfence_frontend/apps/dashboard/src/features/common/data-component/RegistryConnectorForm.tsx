import { useEffect } from 'react';
import { ActionFunctionArgs, useFetcher } from 'react-router-dom';

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
import { invalidateAllQueries } from '@/queries';
import { RegistryType } from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

type ActionReturnType = {
  message?: string;
  fieldErrors?: Record<string, string>;
  success: boolean;
};

type FormProps = {
  onSuccess: () => void;
  renderButton: (state: 'submitting' | 'idle' | 'loading') => JSX.Element;
  registryType: string;
};

function unwrapNestedStruct(
  obj: Record<string, string>,
): Record<string, string | Record<string, string>> {
  const results: Record<string, string | Record<string, string>> = {};
  for (const key in obj) {
    if (key.includes('.')) {
      const [first, second] = key.split('.');
      if (!results[first]) {
        results[first] = {};
      }
      (results[first] as Record<string, string>)[second] = obj[key];
    } else {
      results[key] = obj[key];
    }
  }

  return results;
}

const getRequestBodyByRegistryType = (
  registryType: string,
  body: {
    [k: string]: string;
  },
): ModelRegistryAddReq => {
  if (registryType in RegistryType) {
    const requestParams: ModelRegistryAddReq = {
      name: body.name,
      registry_type: registryType,
      ...unwrapNestedStruct(body),
    };
    return requestParams;
  } else {
    throw new Error('Invalid registry type');
  }
};

export const registryConnectorActionApi = async ({
  request,
}: ActionFunctionArgs): Promise<ActionReturnType> => {
  const formData = await request.formData();
  const registryType = formData.get('registryType')?.toString();

  if (!registryType) {
    throw new Error('Registry Type is required');
  }

  const formBody = Object.fromEntries(formData) as {
    [k: string]: string;
  };

  if (registryType === RegistryType.google_container_registry) {
    const addRegistryGCR = apiWrapper({ fn: getRegistriesApiClient().addRegistryGCR });

    const response = await addRegistryGCR({
      name: formBody.name.toString(),
      registryUrl: formBody.registry_url.toString(),
      serviceAccountJson: formData.get('service_account_json') as Blob,
    });

    if (!response.ok) {
      if (response.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await response.error.response.json();
        return {
          success: false,
          message: modelResponse.message ?? '',
          fieldErrors: modelResponse.error_fields ?? {},
        };
      } else if (response.error.response.status === 403) {
        const message = await get403Message(response.error);
        return {
          success: false,
          message,
        };
      }
    }
  } else {
    const addRegistry = apiWrapper({ fn: getRegistriesApiClient().addRegistry });

    const response = await addRegistry({
      modelRegistryAddReq: getRequestBodyByRegistryType(registryType, formBody),
    });

    if (!response.ok) {
      if (response.error.response.status === 400) {
        const modelResponse: ApiDocsBadRequestResponse =
          await response.error.response.json();
        return {
          success: false,
          message: modelResponse.message ?? '',
          fieldErrors: modelResponse.error_fields ?? {},
        };
      } else if (response.error.response.status === 403) {
        const message = await get403Message(response.error);
        return {
          success: false,
          message,
        };
      }
    }
  }
  invalidateAllQueries();
  return {
    success: true,
  };
};

export type RegistryFormProps = {
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
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
      id="registryConnectorForm"
    >
      {registryType === RegistryType.docker_hub && (
        <DockerRegistryConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      {registryType === RegistryType.ecr && (
        <AmazonECRConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}
      {registryType === RegistryType.azure_container_registry && (
        <AzureCRConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}
      {registryType === RegistryType.google_container_registry && (
        <GoogleCRConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      {registryType === RegistryType.docker_private_registry && (
        <DockerPriavateConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      {registryType === RegistryType.harbor && (
        <HarborConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      {registryType === RegistryType.gitlab && (
        <GitLabConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      {registryType === RegistryType.jfrog_container_registry && (
        <JfrogConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      {registryType === RegistryType.quay && (
        <QuayConnectorForm
          errorMessage={fetcher?.data?.message}
          fieldErrors={fetcher?.data?.fieldErrors}
        />
      )}

      <input type="text" name="registryType" hidden readOnly value={registryType} />
      {renderButton(fetcher.state)}
    </fetcher.Form>
  );
};
