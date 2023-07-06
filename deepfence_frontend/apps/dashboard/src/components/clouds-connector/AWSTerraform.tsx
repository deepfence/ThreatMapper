import { memo } from 'react';
import { Card, IconButton, Step, Stepper } from 'ui-components';

import { useCopyToClipboardState } from '@/components/CopyToClipboard';
import { DFLink } from '@/components/DFLink';
import { CopyLineIcon } from '@/components/icons/common/CopyLine';
import { InfoIcon } from '@/components/icons/common/Info';
import { useGetApiToken } from '@/features/common/data-component/getApiTokenApiLoader';

const FirstCommand = ({ command }: { command: string }) => {
  const { copy, isCopied } = useCopyToClipboardState();

  return (
    <div className="text-p7 dark:text-text-text-and-icon">
      <p className="mb-2.5">
        Copy the following code and paste it into a .tf file on your local machine:
      </p>
      <Card className="w-full relative flex p-4 items-center">
        <pre className="h-fit text-p7 dark:text-text-text-and-icon">{command}</pre>
        <div className="flex items-center ml-auto self-start">
          {isCopied ? 'copied' : null}
          <IconButton
            className="dark:focus:outline-none"
            icon={<CopyLineIcon />}
            variant="flat"
            onClick={() => {
              copy(command);
            }}
          />
        </div>
      </Card>
    </div>
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

export const AWSTerraform = memo(() => {
  const { status, data } = useGetApiToken();
  const dfApiKey =
    status !== 'idle'
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token === undefined
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token;
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
          <FirstCommand command={code} />
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
