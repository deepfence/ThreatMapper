import { Card, TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_acr",
    "non_secret": {
      "azure_registry_url": "https://example.azurecr.io",
      "azure_registry_username": "username"
    },
    "secret": {
      "azure_registry_password": "password"
    },
    "registry_type": "azure_container_registry"
  }
*/

export const AzureCRConnectorForm = ({
  errorMessage,
  fieldErrors,
}: RegistryFormProps) => {
  return (
    <>
      <div className="text-p4a text-text-input-value mt-1.5 mb-4">
        Connect to your Azure Container Registry. Find out more information by{' '}
        <DFLink
          href={`https://community.deepfence.io/threatmapper/docs/v2.5/registries/`}
          target="_blank"
          rel="noreferrer"
        >
          reading our documentation
        </DFLink>
        .
      </div>
      <Card className="p-4">
        <p className="text-p1 text-text-input-value">Enter Information</p>
        <div className="w-full flex flex-col relative mt-4 gap-y-8">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            name="name"
            placeholder="Registry Name"
            color={fieldErrors?.['name'] ? 'error' : 'default'}
            helperText={fieldErrors?.['name']}
            required
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry URL"
            type={'text'}
            name="non_secret.azure_registry_url"
            placeholder="Registry URL"
            color={fieldErrors?.['azure_registry_url'] ? 'error' : 'default'}
            helperText={fieldErrors?.['azure_registry_url']}
            required
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Username"
            type={'text'}
            name="non_secret.azure_registry_username"
            placeholder="Username"
            color={fieldErrors?.['azure_registry_username'] ? 'error' : 'default'}
            helperText={fieldErrors?.['azure_registry_username']}
            required
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Password"
            type={'password'}
            name="secret.azure_registry_password"
            placeholder="••••••••"
            color={fieldErrors?.['azure_registry_password'] ? 'error' : 'default'}
            helperText={fieldErrors?.['azure_registry_password']}
            required
          />
        </div>
        {errorMessage && <p className="mt-2 text-status-error text-p7">{errorMessage}</p>}
      </Card>
    </>
  );
};
