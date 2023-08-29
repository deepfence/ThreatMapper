import { Step, StepIndicator, Stepper } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { InfoIcon } from '@/components/icons/common/Info';

export const AWSFargateConnectorForm = () => {
  return (
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
        title="AWS Fargate"
      >
        <div className="text-p7 dark:text-text-text-and-icon">
          On AWS Fargate, the ThreatMapper sensor agents are deployed as a sidecar
          container, using a task definition.{' '}
          <DFLink
            href={`https://docs.deepfence.io/threatmapper/docs/sensors/aws-fargate`}
            target="_blank"
            rel="noreferrer"
            className="mt-2"
          >
            Please read our documentation
          </DFLink>
          .
        </div>
      </Step>
    </Stepper>
  );
};
