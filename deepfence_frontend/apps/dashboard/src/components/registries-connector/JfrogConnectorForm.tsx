import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_jfrog",
    "non_secret": {
      "jfrog_registry_url": "https://example.jfrog.io",
      "jfrog_repository": "repository",
      "jfrog_username": "username"
    },
    "secret": {
      "jfrog_password": "password"
    },
    "registry_type": "jfrog_container_registry"
  }
*/

export const JfrogConnectorForm = ({ errorMessage, fieldErrors }: RegistryFormProps) => {
  return (
    <>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="JFrog Container Registry">
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
              hint="e.g. https://jfrog.company.com"
              sizing="sm"
              name="non_secret.jfrog_registry_url"
              placeholder="Registry URL"
              color={fieldErrors?.['jfrog_registry_url'] ? 'error' : 'default'}
              helperText={fieldErrors?.['jfrog_registry_url']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Repository"
              type={'text'}
              hint="e.g. docker"
              sizing="sm"
              name="non_secret.jfrog_repository"
              placeholder="Repository"
              color={fieldErrors?.['jfrog_repository'] ? 'error' : 'default'}
              helperText={fieldErrors?.['jfrog_repository']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Username"
              type={'text'}
              sizing="sm"
              name="non_secret.jfrog_username"
              placeholder="Username"
              color={fieldErrors?.['jfrog_username'] ? 'error' : 'default'}
              helperText={fieldErrors?.['jfrog_username']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Password"
              type={'password'}
              sizing="sm"
              name="secret.jfrog_password"
              placeholder="••••••••"
              color={fieldErrors?.['jfrog_password'] ? 'error' : 'default'}
              helperText={fieldErrors?.['jfrog_password']}
            />
            <div className="text-xs">
              <div className="text-sm">
                Using Certificate based Docker client Authentication?
              </div>
              <div>
                A custom certificate is configured by creating a directory under
                /etc/docker/certs.d on Deepfence console machine, using the same name as
                the registry&apos;s hostname provided above. All *.crt files are added to
                this directory as CA roots.{' '}
                <DFLink
                  href="https://docs.docker.com/engine/security/certificates/"
                  target="_blank"
                >
                  https://docs.docker.com/engine/security/certificates/
                </DFLink>{' '}
              </div>
              <div className="mt-2">Supported Versions: 6.19.1 and above</div>
            </div>
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          </Card>
        </Step>
      </Stepper>
    </>
  );
};
