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

export const GCPConnectorForm = () => {
  const { status, data } = useGetApiToken();
  const dfApiKey =
    status !== 'idle'
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token === undefined
      ? '---DEEPFENCE-API-KEY---'
      : data?.api_token;
  const code = `provider "google" {
  project = "<PROJECT_ID>; ex. dev1-123456"
  region  = "<REGION_ID>; ex. asia-east1"
}

provider "google-beta" {
  project = "<PROJECT_ID> ex. dev1-123456"
  region  = "<REGION_ID>; ex. asia-east1"
}

module "cloud-scanner_example_single-project" {
  source              = "deepfence/cloud-scanner/gcp//examples/single-project"
  version             = "0.2.0"
  mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port   = "443"
  deepfence-key       = "${dfApiKey}"
  name                = "deepfence-cloud-scanner"
  image_name          = "[us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:latest](http://us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:latest)"
}

variable "image" {
  type        = string
  default     = "[us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:1.5.0](http://us-east1-docker.pkg.dev/deepfenceio/deepfence/cloud-scanner:1.5.0)"
}
`;

  return (
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
          Connect to your Google Cloud Account via Teraform. Find out more information by{' '}
          <DFLink
            href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
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
  );
};
