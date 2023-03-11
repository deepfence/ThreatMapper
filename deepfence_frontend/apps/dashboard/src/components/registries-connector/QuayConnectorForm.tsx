import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

type DockerConnectionFormProps = {
  errorMessage: string;
};
export const QuayConnectorForm = ({ errorMessage }: DockerConnectionFormProps) => {
  return (
    <>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Quay Container Registry">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Using Certificate based Docker client Authentication? A custom certificate is
            configured by creating a directory under /etc/docker/certs.d on Deepfence
            console machine, using the same name as the registry&apos;s hostname provided
            above. All *.crt files are added to this directory as CA roots &nbsp;
            <a
              href={`https://docs.docker.com/engine/security/certificates/`}
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
              label="Registry URL"
              type={'text'}
              sizing="sm"
              name="registryUrl"
              placeholder="Registry URL"
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
              label="OAuth 2 Access Token (Optional)"
              type={'password'}
              sizing="sm"
              name="accessToken"
              placeholder="OAuth Access Token"
            />
          </Card>
        </Step>
      </Stepper>
      <p className="text-red-500 text-sm ml-14">{errorMessage}</p>
    </>
  );
};
