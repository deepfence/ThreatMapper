import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

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
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Gitlab Container Registry">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Using Certificate based Docker client Authentication? A custom certificate is
            configured by creating a directory under /etc/docker/certs.d on Deepfence
            console machine, using the same name as the registry&apos;s hostname provided
            above. All *.crt files are added to this directory as CA roots &nbsp;
            <DFLink
              href={`https://docs.docker.com/engine/security/certificates/`}
              target="_blank"
              rel="noreferrer"
            >
              reading our documentation
            </DFLink>
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
              name="name"
              placeholder="Registry Name"
              color={fieldErrors?.['name'] ? 'error' : 'default'}
              helperText={fieldErrors?.['name']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Gitlab Server URL"
              type={'text'}
              sizing="sm"
              name="non_secret.gitlab_server_url"
              placeholder="Gilab Server URL"
              color={fieldErrors?.['gitlab_server_url'] ? 'error' : 'default'}
              helperText={fieldErrors?.['gitlab_server_url']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="GitLab Registry URL"
              type={'text'}
              sizing="sm"
              name="non_secret.gitlab_registry_url"
              placeholder="GitLab Registry URL"
              color={fieldErrors?.['gitlab_registry_url'] ? 'error' : 'default'}
              helperText={fieldErrors?.['gitlab_registry_url']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Gitlab Access Token"
              type={'password'}
              sizing="sm"
              name="secret.gitlab_access_token"
              placeholder="Gitlab Access Token"
              color={fieldErrors?.['gitlab_access_token'] ? 'error' : 'default'}
              helperText={fieldErrors?.['gitlab_access_token']}
            />
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          </Card>
        </Step>
      </Stepper>
    </>
  );
};
