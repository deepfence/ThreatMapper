import { useState } from 'react';
import { HiArrowNarrowRight, HiViewGridAdd } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import { Select, SelectItem, Step, Stepper, Typography } from 'ui-components';

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
        <Step indicator={<HiViewGridAdd />} title="Cloud Formation">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
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
            <Select
              value={region}
              name="region"
              onChange={(value) => {
                setRegion(value);
              }}
              placeholder="Select a region"
              sizing="xs"
            >
              {AWS_REGIONS.map((region) => (
                <SelectItem value={region} key={region} />
              ))}
            </Select>
          </div>
        </Step>
        <Step indicator="2" title="Deploy">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            <p>
              Deploy all modules for Deepfence Posture Scanner for a single account. For
              information on AWS Organizations and account types, see AWS docs.
            </p>
            <p className={`${Typography.size.sm} text-blue-600 dark:text-blue-500 mt-2`}>
              <a
                href={`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner.template&stackName=Deepfence-Cloud-Scanner&param_CloudScannerImage=quay.io/deepfenceio/cloud-scanner:2.0.0`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                Deploy on one AWS account
                <HiArrowNarrowRight className="pl-1" />
              </a>
            </p>
            <p className={`mt-2 ${Typography.size.sm} text-blue-600 dark:text-blue-500`}>
              <a
                href={`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?templateURL=https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner-org-common.template&stackName=Deepfence-Cloud-Scanner&param_CloudScannerImage=quay.io/deepfenceio/cloud-scanner:2.0.0`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                Deploy on multiple AWS accounts (Organization Deployment)
                <HiArrowNarrowRight className="pl-1" />
              </a>
            </p>
            <p className="mt-4 underline">
              <a
                href={
                  'https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner.template'
                }
                target="_blank"
                rel="noreferrer"
              >
                You can refer the single account template from here.
              </a>
            </p>
            <p className="mt-4 underline">
              <a
                href={
                  'https://deepfence-public.s3.amazonaws.com/cloud-scanner/deepfence-cloud-scanner-org-common.template'
                }
                target="_blank"
                rel="noreferrer"
              >
                You can refer the organization account template from here.
              </a>
            </p>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
