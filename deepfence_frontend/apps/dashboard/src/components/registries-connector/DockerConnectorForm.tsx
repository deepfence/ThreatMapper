import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';

type FormProps = {
  errorMessage: string;
};

/**
sample request body
  {
    "name": "example_dockerhub",
    "non_secret": {
      "docker_hub_namespace": "namespace",
      "docker_hub_username": "username"
    },
    "secret": {
      "docker_hub_password": "password"
    },
    "registry_type": "docker_hub"
  }
*/

export const DockerConnectorForm = ({ errorMessage }: FormProps) => {
  return (
    <>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Container Registry">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Connect to your Docker Registry by{' '}
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
        <Step indicator="1" title="Enter Information">
          <Card className="w-full relative p-5 mt-2 flex flex-col gap-y-4">
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Registry Name"
              type={'text'}
              sizing="sm"
              name="name"
              placeholder="Registry Name"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Namespace"
              type={'text'}
              sizing="sm"
              name="non_secret.docker_hub_namespace"
              placeholder="Namespace"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Username"
              type={'text'}
              sizing="sm"
              name="non_secret.docker_hub_username"
              placeholder="Username"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Password"
              type={'password'}
              sizing="sm"
              name="secret.docker_hub_password"
              placeholder="••••••••"
            />
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          </Card>
        </Step>
      </Stepper>
    </>
  );
};
