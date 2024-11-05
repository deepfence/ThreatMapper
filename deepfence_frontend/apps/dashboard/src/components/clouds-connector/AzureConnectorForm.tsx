import { Step, StepIndicator, Stepper } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { InfoIcon } from '@/components/icons/common/Info';

export const AzureConnectorForm = () => {
  return (
    <div className="mt-4">
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
            Connect to your Microsoft Azure via terraform. Find out more information by{' '}
            <DFLink
              href={`https://community.deepfence.io/threatmapper/docs/v2.5/cloudscanner/azure`}
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
};
