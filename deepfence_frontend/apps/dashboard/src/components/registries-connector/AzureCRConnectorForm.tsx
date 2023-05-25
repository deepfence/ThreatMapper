import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

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
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Azure Registry Connection">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Google Azure Account. Find out more information by{' '}
          <DFLink
            href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
            target="_blank"
            rel="noreferrer"
          >
            reading our documentation
          </DFLink>
          .
        </div>
      </Step>
      <Step indicator="1" title="Region Selection">
        <Card className="w-full flex flex-col relative p-5 mt-2 gap-y-4">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            sizing="sm"
            name="name"
            placeholder="Registry Name"
            color={fieldErrors?.['name'] ? 'error' : 'default'}
            helperText={fieldErrors?.['name']}
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry URL"
            type={'text'}
            sizing="sm"
            name="non_secret.azure_registry_url"
            placeholder="Registry URL"
            color={fieldErrors?.['azure_registry_url'] ? 'error' : 'default'}
            helperText={fieldErrors?.['azure_registry_url']}
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Username"
            type={'text'}
            sizing="sm"
            name="non_secret.azure_registry_username"
            placeholder="Username"
            color={fieldErrors?.['azure_registry_username'] ? 'error' : 'default'}
            helperText={fieldErrors?.['azure_registry_username']}
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Password"
            type={'password'}
            sizing="sm"
            name="secret.azure_registry_password"
            placeholder="••••••••"
            color={fieldErrors?.['azure_registry_password'] ? 'error' : 'default'}
            helperText={fieldErrors?.['azure_registry_password']}
          />
          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
        </Card>
      </Step>
    </Stepper>
  );
};
