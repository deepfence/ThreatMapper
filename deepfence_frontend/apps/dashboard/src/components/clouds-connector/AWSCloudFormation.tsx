import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Listbox, ListboxOption, Step, Stepper } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { InfoIcon } from '@/components/icons/common/Info';

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'af-south-1',
  'ap-east-1',
  'ap-south-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ca-central-1',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-south-1',
  'eu-north-1',
  'me-south-1',
  'me-central-1',
  'sa-east-1',
  'us-gov-east-1',
  'us-gov-west-1',
];

export const AWSCloudFormation = () => {
  const [region, setRegion] = useState('us-east-1');
  return (
    <div className="w-full sm:w-1/2">
      <Stepper>
        <Step
          indicator={
            <span className="w-4 h-4">
              <InfoIcon />
            </span>
          }
          title="Cloud Formation"
        >
          <div className="text-p7 dark:text-text-text-and-icon">
            Connect to your AWS Cloud Account via Cloud Formation. Find out more
            information by{' '}
            <Link to="/" className="text-blue-600 dark:text-blue-500">
              reading our documentation
            </Link>
            .
          </div>
        </Step>
        <Step indicator="1" title="Region Selection">
          <div className="w-1/2">
            <Listbox
              value={region}
              name="region"
              onChange={(value) => {
                setRegion(value);
              }}
              placeholder="Select a region"
              getDisplayValue={() => {
                return region;
              }}
            >
              {AWS_REGIONS.map((region) => (
                <ListboxOption value={region} key={region}>
                  {region}
                </ListboxOption>
              ))}
            </Listbox>
          </div>
        </Step>
        <Step indicator="2" title="Deploy">
          <div className="text-p7 dark:text-text-text-and-icon">
            <p>
              Deploy all modules for Deepfence Posture Scanner for a single account. For
              information on AWS Organizations and account types, see AWS docs.
            </p>
            <p>
              <DFLink
                href={`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner.template&stackName=Deepfence-Cloud-Scanner`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                Deploy on one AWS account
              </DFLink>
            </p>
            <p className="mt-4">
              <DFLink
                href={`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacksets/create`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                Deploy on multiple AWS accounts
              </DFLink>
            </p>
            <p className="mt-2 underline">
              <DFLink
                href={
                  'https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner.template'
                }
                target="_blank"
                rel="noreferrer"
              >
                You can refer the template from here.
              </DFLink>
            </p>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
