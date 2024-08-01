import { memo } from 'react';
import { Step, StepIndicator, Stepper } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { InfoIcon } from '@/components/icons/common/Info';

export const AWSTerraform = memo(() => {
  return (
    <div className="w-full sm:w-1/2 mt-4">
      <Stepper>
        <Step
          indicator={
            <StepIndicator className="rounded-full">
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="w-4 h-4">
                  <InfoIcon />
                </span>
              </div>
            </StepIndicator>
          }
          title="Terraform"
        >
          <div className="text-p7a text-text-text-and-icon">
            Connect to your AWS Cloud Account via Terraform. Find out more information by{' '}
            <DFLink
              href={`https://community.deepfence.io/threatmapper/docs/v2.3/cloudscanner/aws#terraform`}
              target="_blank"
              rel="noreferrer"
              className="mt-2"
            >
              reading our documentation
            </DFLink>
            .
          </div>
        </Step>
      </Stepper>
    </div>
  );
});
