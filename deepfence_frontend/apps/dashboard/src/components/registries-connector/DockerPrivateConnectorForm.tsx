import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_dockerprivate",
    "non_secret": {
      "docker_registry_url": "https://example.docker.com",
      "docker_username": "username"
    },
    "secret": {
      "docker_password": "password"
    },
    "registry_type": "docker_private_registry"
  }
*/

export const DockerPriavateConnectorForm = ({
  errorMessage,
  fieldErrors,
}: RegistryFormProps) => {
  return (
    <>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Container Registry">
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
              label="Registry URL"
              type={'text'}
              sizing="sm"
              name="non_secret.docker_registry_url"
              placeholder="Registry URL"
              color={fieldErrors?.['docker_registry_url'] ? 'error' : 'default'}
              helperText={fieldErrors?.['docker_registry_url']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Username"
              type={'text'}
              sizing="sm"
              name="non_secret.docker_username"
              placeholder="Username"
              color={fieldErrors?.['docker_username'] ? 'error' : 'default'}
              helperText={fieldErrors?.['docker_username']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Password"
              type={'password'}
              sizing="sm"
              name="secret.docker_password"
              placeholder="••••••••"
              color={fieldErrors?.['docker_password'] ? 'error' : 'default'}
              helperText={fieldErrors?.['docker_password']}
            />
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          </Card>
        </Step>
      </Stepper>
    </>
  );
};
