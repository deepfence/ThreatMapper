import { HiViewGridAdd } from 'react-icons/hi';
import { Button, Card, Step, Stepper, TextInput, Typography } from 'ui-components';

type DockerConnectionFormProps = {
  errorMessage: string;
};
export const DockerConnectorForm = ({ errorMessage }: DockerConnectionFormProps) => {
  return (
    <>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Container Registry">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Connect to your Docker Registry by{' '}
            <a
              href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 dark:text-blue-500 mt-2"
            >
              reading our documentation
            </a>
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
              name="registryName"
              placeholder="Registry Name"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Namespace"
              type={'text'}
              sizing="sm"
              name="namespace"
              placeholder="Namespace"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Username"
              type={'text'}
              sizing="sm"
              name="username"
              placeholder="Username"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Password"
              type={'password'}
              sizing="sm"
              name="password"
              placeholder="••••••••"
            />
          </Card>
        </Step>
      </Stepper>
      <p className="text-red-500 text-sm ml-14">{errorMessage}</p>
    </>
  );
};
