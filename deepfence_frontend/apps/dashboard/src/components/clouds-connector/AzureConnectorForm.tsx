import { HiViewGridAdd } from 'react-icons/hi';
import { Step, Stepper, Typography } from 'ui-components';

export const AzureConnectorForm = () => {
  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Terraform">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Azure Cloud Account via Terraform. Find out more information by{' '}
          <a
            href={`https://community.deepfence.io/threatmapper/doc/v2.0/cloudscanner/azure`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-500 mt-2"
          >
            reading our documentation
          </a>
          .
        </div>
      </Step>
    </Stepper>
  );
};
