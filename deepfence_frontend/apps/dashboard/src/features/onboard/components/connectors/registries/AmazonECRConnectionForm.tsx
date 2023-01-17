import { HiViewGridAdd } from 'react-icons/hi';
import {
  Button,
  Card,
  Step,
  Stepper,
  Switch,
  TextInput,
  Typography,
} from 'ui-components';

export const AmazonECRConnectorForm = () => {
  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Teraform Cloud Formation.">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Google Cloud Account via Teraform. Find out more information by{' '}
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
        <Card className="w-full relative p-5 mt-2">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            sizing="sm"
            name="registryName"
            placeholder="Registry Name"
          />
          <div className="flex flex-col gap-4 mt-4">
            <Switch label="Public Registry Information" />
            <Switch label="Use AWS IAM Role" />
          </div>
          <div className="mt-5 flex flex-row gap-4">
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="AWS Access Key"
              type={'text'}
              sizing="sm"
              name="awsAccessKey"
              placeholder="AWS Access Key"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="AWS Secret Key"
              type={'text'}
              sizing="sm"
              name="awsSecretKey"
              placeholder="AWS Secret Key"
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="AWS Region"
              type={'text'}
              sizing="sm"
              name="awsRegion"
              placeholder="AWS Region"
            />
          </div>
          <Button color="primary" size="xs" className="ml-auto mt-4">
            Save Credentials And Go To Connectors
          </Button>
        </Card>
      </Step>
    </Stepper>
  );
};
