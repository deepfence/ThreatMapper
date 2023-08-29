import { Step, StepIndicator, Stepper } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { InfoIcon } from '@/components/icons/common/Info';

export const AWSEC2ConnectorForm = () => {
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
        title="AWS ECS"
      >
        <div className="text-p7 dark:text-text-text-and-icon">
          In AWS ECS, the ThreatStryker sensors are deployed as a daemon service using
          task definition.{' '}
          <DFLink
            href={`https://community.deepfence.io/threatmapper/docs/sensors/aws-ecs`}
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
