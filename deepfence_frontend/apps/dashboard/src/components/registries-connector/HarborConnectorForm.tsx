import { TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_harbor",
    "non_secret": {
      "harbor_registry_url": "https://example.harbor.io",
      "harbor_username": "username",
      "harbor_project_name": "project_name"
    },
    "secret": {
      "harbor_password": "password"
    },
    "registry_type": "harbor"
  }
*/

export const HarborConnectorForm = ({ errorMessage, fieldErrors }: RegistryFormProps) => {
  return (
    <>
      <div className="text-p4 dark:text-text-input-value">
        Using Certificate based Docker client Authentication? A custom certificate is
        configured by creating a directory under /etc/docker/certs.d on Deepfence console
        machine, using the same name as the registry&apos;s hostname provided above. All
        *.crt files are added to this directory as CA roots &nbsp;
        <DFLink
          href={`https://docs.docker.com/engine/security/certificates/`}
          target="_blank"
          rel="noreferrer"
        >
          More information
        </DFLink>
        .
      </div>
      <p className="mt-6 text-p1 dark:text-text-input-value">Enter Information</p>
      <div className="w-full relative mt-4 flex flex-col gap-y-8">
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
          name="non_secret.harbor_registry_url"
          placeholder="Registry URL"
          color={fieldErrors?.['harbor_registry_url'] ? 'error' : 'default'}
          helperText={fieldErrors?.['harbor_registry_url']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Project Name"
          type={'text'}
          name="non_secret.harbor_project_name"
          placeholder="Project Name"
          color={fieldErrors?.['harbor_project_name'] ? 'error' : 'default'}
          helperText={fieldErrors?.['harbor_project_name']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Username"
          type={'text'}
          name="non_secret.harbor_username"
          placeholder="Username"
          color={fieldErrors?.['harbor_username'] ? 'error' : 'default'}
          helperText={fieldErrors?.['harbor_username']}
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Password"
          type={'password'}
          name="secret.harbor_password"
          placeholder="••••••••"
          color={fieldErrors?.['harbor_password'] ? 'error' : 'default'}
          helperText={fieldErrors?.['harbor_password']}
        />
        <div className="mt-2 text-p7 dark:text-text-input-value">
          Supported Versions: 1.8.2 and above
        </div>
      </div>
      {errorMessage && (
        <p className="mt-4 dark:text-status-error text-p7">{errorMessage}</p>
      )}
    </>
  );
};
