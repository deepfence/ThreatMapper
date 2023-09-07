import { TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_gitlab",
    "non_secret": {
      "gitlab_registry_url": "https://example.gitlab.io",
      "gitlab_server_url": "https://gitlab.example.com"
    },
    "secret": {
      "gitlab_access_token": "access_token"
    },
    "registry_type": "gitlab"
  }
*/

export const GitLabConnectorForm = ({ errorMessage, fieldErrors }: RegistryFormProps) => {
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
          label="Gitlab Server URL"
          info="e.g. https://gitlab.example.com"
          type={'text'}
          name="non_secret.gitlab_server_url"
          placeholder="Gilab Server URL"
          color={fieldErrors?.['gitlab_server_url'] ? 'error' : 'default'}
          helperText={fieldErrors?.['gitlab_server_url']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="GitLab Registry URL"
          info="e.g. registry.gitlab.example.com (for registries configured under its own domain) or gitlab.example.com:5050 (for registries configured under an existing gitlab domain, gitlab.example.com)"
          type={'text'}
          name="non_secret.gitlab_registry_url"
          placeholder="GitLab Registry URL"
          color={fieldErrors?.['gitlab_registry_url'] ? 'error' : 'default'}
          helperText={fieldErrors?.['gitlab_registry_url']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Gitlab Access Token"
          type={'password'}
          name="secret.gitlab_access_token"
          placeholder="Gitlab Access Token"
          color={fieldErrors?.['gitlab_access_token'] ? 'error' : 'default'}
          helperText={fieldErrors?.['gitlab_access_token']}
        />
        <div className="mt-2 text-p7 dark:text-text-input-value">
          Supported Versions: 11.8 and above
        </div>
      </div>
      {errorMessage && (
        <p className="mt-4 dark:text-status-error text-p7">{errorMessage}</p>
      )}
    </>
  );
};
