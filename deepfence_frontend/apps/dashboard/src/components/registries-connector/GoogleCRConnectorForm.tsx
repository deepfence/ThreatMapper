import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

export const GoogleCRConnectorForm = () => {
  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Google Registry Connection">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Google Cloud Account. Find out more information by{' '}
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
      <Step indicator="1" title="Region Selection">
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
        </Card>
      </Step>
    </Stepper>
  );
};
