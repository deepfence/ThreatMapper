import { useSuspenseQuery } from '@suspensive/react-query';
import { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CircleSpinner,
  ListboxOptionV2,
  ListboxV2,
  Step,
  StepIndicator,
  StepLine,
  Stepper,
} from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { InfoIcon } from '@/components/icons/common/Info';
import { queries } from '@/queries';

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

const PLACEHOLDER_VERSION = '---PRODUCT_TAG_VERSION--';

const useGetVersion = () => {
  return useSuspenseQuery({
    ...queries.setting.productVersion(),
  });
};

const Links = ({ region }: { region: string }) => {
  const { data: dataVersion } = useGetVersion();
  const version = dataVersion.version || PLACEHOLDER_VERSION;

  return (
    <>
      <DFLink
        href={`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?templateURL=https://artifacts.threatmapper.org/cloud-scanner/self-hosted/single-account-deployment/deepfence-cloud-scanner.template&stackName=Deepfence-Cloud-Scanner&param_CloudScannerImage=quay.io/deepfenceio/cloud_scanner_ce:${version}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center mt-4"
      >
        Deploy on one AWS account
      </DFLink>

      <DFLink
        href="https://artifacts.threatmapper.org/cloud-scanner/self-hosted/single-account-deployment/deepfence-cloud-scanner.template"
        target="_blank"
        rel="noreferrer"
        className="mt-2"
      >
        You can refer the single account template from here
      </DFLink>
      <DFLink
        href={`https://${region}.console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?templateURL=https://artifacts.threatmapper.org/cloud-scanner/self-hosted/organization-deployment/deepfence-cloud-scanner-org-common.template&stackName=Deepfence-Cloud-Scanner&param_CloudScannerImage=quay.io/deepfenceio/cloud_scanner_ce:${version}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center mt-4"
      >
        Deploy on multiple AWS accounts (Organization Deployment)
      </DFLink>
      <DFLink
        href={
          'https://artifacts.threatmapper.org/cloud-scanner/self-hosted/organization-deployment/deepfence-cloud-scanner-org-common.template'
        }
        target="_blank"
        rel="noreferrer"
        className="mt-2"
      >
        You can refer the organization account template from here.
      </DFLink>
    </>
  );
};

export const AWSCloudFormation = () => {
  const [region, setRegion] = useState('us-east-1');

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
              <StepLine />
            </StepIndicator>
          }
          title="Cloud Formation"
        >
          <div className="text-p7a text-text-text-and-icon">
            Connect to your AWS Cloud Account via Cloud Formation. Find out more
            information by{' '}
            <Link
              to="https://community.deepfence.io/threatmapper/docs/v2.5/cloudscanner/aws#cloudformation"
              className="text-text-link"
              target="_blank"
              rel="noreferrer"
            >
              reading our documentation
            </Link>
            .
          </div>
        </Step>
        <Step
          indicator={
            <StepIndicator className="rounded-full">
              <span className="w-6 h-6 flex items-center justify-center">1</span>
              <StepLine />
            </StepIndicator>
          }
          title="Region Selection"
        >
          <div className="w-1/2">
            <ListboxV2
              value={region}
              name="region"
              setValue={(value) => {
                setRegion(value);
              }}
              placeholder="Select a region"
              getDisplayValue={() => {
                return region;
              }}
            >
              {AWS_REGIONS.map((region) => (
                <ListboxOptionV2 value={region} key={region}>
                  {region}
                </ListboxOptionV2>
              ))}
            </ListboxV2>
          </div>
        </Step>
        <Step
          indicator={
            <StepIndicator className="rounded-full">
              <span className="w-6 h-6 flex items-center justify-center">2</span>
            </StepIndicator>
          }
          title="Deploy"
        >
          <div className="text-p7a text-text-text-and-icon">
            <p>
              Deploy all modules for Deepfence Posture Scanner for a single account. For
              information on AWS Organizations and account types, see AWS docs.
            </p>
            <Suspense
              fallback={
                <div className="mt-4">
                  <CircleSpinner size="sm" />
                </div>
              }
            >
              <Links region={region} />
            </Suspense>
          </div>
        </Step>
      </Stepper>
    </div>
  );
};
