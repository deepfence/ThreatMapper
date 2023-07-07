import { useSuspenseQuery } from '@suspensive/react-query';
import { memo, Suspense } from 'react';
import { Card, IconButton, Step, Stepper } from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { InfoIcon } from '@/components/icons/common/Info';
import { queries } from '@/queries';

const useGetApiToken = () => {
  return useSuspenseQuery({
    ...queries.auth.apiToken(),
    keepPreviousData: true,
  });
};
const PLACEHOLDER_API_KEY = '---DEEPFENCE-API-KEY--';

const FirstCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();
  const { status, data } = useGetApiToken();
  const apiToken = data?.apiToken?.api_token;
  const dfApiKey =
    status !== 'success'
      ? PLACEHOLDER_API_KEY
      : apiToken === undefined
      ? PLACEHOLDER_API_KEY
      : apiToken;

  const code = `provider "aws" {
  region = "<AWS-REGION>; eg. us-east-1"
}

module "deepfence-cloud-scanner_example_single-account" {
  source = "deepfence/cloud-scanner/aws//examples/single-account-ecs"
  version = "0.3.0"
  mgmt-console-url = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port = "443"
  deepfence-key = "${dfApiKey}"
  name = "deepfence-cloud-scanner"
}

variable "image" {
  type        = string
  default     = "[quay.io/deepfenceio/cloud-scanner:1.5.0](http://quay.io/deepfenceio/cloud-scanner:1.5.0)"
}
`;

  return (
    <>
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">{code}</pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy(code);
          }}
        />
      </div>
    </>
  );
};
const SecondCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className="flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">terraform init</pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy('terraform init');
          }}
        />
      </div>
    </div>
  );
};
const ThirdCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className="flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">terraform plan</pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy('terraform plan');
          }}
        />
      </div>
    </div>
  );
};
const FourthCommand = () => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className="flex items-center">
      <pre className="h-fit text-p7 dark:text-text-text-and-icon">terraform apply</pre>
      <div className="flex items-center ml-auto self-start">
        {isCopied ? 'copied' : null}
        <IconButton
          className="dark:focus:outline-none"
          icon={<CopyLineIcon />}
          variant="flat"
          onClick={() => {
            copy('terraform apply');
          }}
        />
      </div>
    </div>
  );
};

const Skeleton = () => {
  return (
    <>
      <div className="animate-pulse flex flex-col gap-y-2">
        <div className="h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[300px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[4px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <br />

        <div className="h-2 w-[400px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[420px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[380px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[220px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[190px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[300px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="ml-4 h-2 w-[250px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[4px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <br />

        <div className="h-2 w-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[240px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[600px] bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-2 w-[4px] bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </>
  );
};

export const AWSTerraform = memo(() => {
  return (
    <div className="w-full sm:w-1/2">
      <Stepper>
        <Step
          indicator={
            <span className="w-4 h-4">
              <InfoIcon />
            </span>
          }
          title="Teraform"
        >
          <div className="text-p7 dark:text-text-text-and-icon">
            Connect to your AWS Cloud Account via Teraform. Find out more information by{' '}
            <DFLink
              href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/aws/latest/examples/single-account-ecs#usag`}
              target="_blank"
              rel="noreferrer"
              className="mt-2"
            >
              reading our documentation
            </DFLink>
            .
          </div>
        </Step>
        <Step indicator="1" title="Copy Code">
          <div className="text-p7 dark:text-text-text-and-icon">
            <p className="mb-2.5">
              Copy the following code and paste it into a .tf file on your local machine:
            </p>
            <Card className="w-full relative flex p-4 items-center">
              <Suspense fallback={<Skeleton />}>
                <FirstCommand />
              </Suspense>
            </Card>
          </div>
        </Step>
        <Step indicator="2" title="Deploy">
          <div className="text-p7 dark:text-text-text-and-icon">
            <p className="mb-2.5">
              Copy the following commands and paste them into your shell.
            </p>
            <Card className="w-full relative flex flex-col p-4">
              <SecondCommand />
              <ThirdCommand />
              <FourthCommand />
            </Card>
          </div>
        </Step>
      </Stepper>
    </div>
  );
});
