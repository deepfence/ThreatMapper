import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';

export const HarborConnectorForm = () => {
  return (
    <>
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Harbor Container Registry">
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
              label="Project Name"
              type={'text'}
              sizing="sm"
              name="projectName"
              placeholder="Project Name"
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
      {/* <p className="text-red-500 text-sm ml-14">{errorMessage}</p> */}
    </>
  );
};
