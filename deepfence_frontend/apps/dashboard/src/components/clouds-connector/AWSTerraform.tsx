import { memo } from 'react';
import { HiViewGridAdd } from 'react-icons/hi';
import { Step, Stepper, Typography } from 'ui-components';

export const AWSTerraform = memo(() => {
  return (
    <div className="w-full sm:w-1/2">
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Terraform">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Connect to your AWS Cloud Account via Terraform. Find out more information by{' '}
            <a
              href={`https://community.deepfence.io/threatmapper/doc/v2.0/cloudscanner/aws#terraform`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-700 dark:text-blue-500 mt-2"
            >
              reading our documentation
            </a>
            .
          </div>
        </Step>
      </Stepper>
    </div>
  );
});
