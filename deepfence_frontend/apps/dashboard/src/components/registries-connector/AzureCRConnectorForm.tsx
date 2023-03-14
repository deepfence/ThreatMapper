import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';

export const AzureCRConnectorForm = () => {
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
  );
};
