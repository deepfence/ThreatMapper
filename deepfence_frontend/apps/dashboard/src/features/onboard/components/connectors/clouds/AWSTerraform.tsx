import cx from 'classnames';
import { memo } from 'react';
import { useCopyToClipboard } from 'react-use';
import { Button, Card, Step, Stepper, Typography } from 'ui-components';

import { CopyToClipboardIcon } from '../../../../../components/CopyToClipboardIcon';
import { usePageNavigation } from '../../../../../utils/usePageNavigation';

export const AWSTerraform = memo(() => {
  const [_, copyToClipboard] = useCopyToClipboard();
  const { navigate } = usePageNavigation();
  const code = `provider "aws" {
  region = "<AWS-REGION>; eg. us-east-1"
}

module "cloud-scanner_example_single-account-ecs" {
  source                        = "deepfence/cloud-scanner/aws//examples/single-account-ecs"
  version                       = "0.1.0"
  mgmt-console-url              = "<Console URL> eg. XXX.XXX.XX.XXX"
  mgmt-console-port             = "443"
  deepfence-key                 = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
}
`;

  const command = `$ terraform init
$ terraform plan
$ terraform apply`;

  return (
    <div className="w-full sm:w-1/2">
      <Stepper>
        <Step indicator="1" title="Teraform Cloud Formation.">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Connect to your AWS Cloud Account via Teraform. Find out more information by{' '}
            <a
              href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/aws/latest/examples/single-account-ecs#usag`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-500 mt-2"
            >
              reading our documentation
            </a>
            .
          </div>
        </Step>
        <Step indicator="2" title="Region Selection">
          <div>
            <p className={`mb-2.5 ${Typography.size.sm} dark:text-gray-200`}>
              Copy the following code and paste it into a .tf file on your local machine:
            </p>
            <Card className="w-full relative ">
              <pre
                className={cx(
                  'p-4 overflow-auto',
                  `${Typography.weight.normal} ${Typography.size.xs} `,
                )}
              >
                {code}
              </pre>
              <CopyToClipboardIcon
                onClick={() => {
                  copyToClipboard(code);
                }}
              />
            </Card>
          </div>
        </Step>
        <Step indicator="3" title="Deploy">
          <div className={`${Typography.size.sm} dark:text-gray-400`}>
            <p className="mb-2.5">
              Copy the following commands and paste them into your shell.
            </p>
            <Card className="w-full relative">
              <div className="relative">
                <pre
                  className={cx(
                    'pl-4 pt-4',
                    'h-fit',
                    `${Typography.weight.normal} ${Typography.size.xs} `,
                  )}
                >
                  $ terraform init
                </pre>
                <CopyToClipboardIcon
                  onClick={() => {
                    copyToClipboard('$ terraform init');
                  }}
                  className="top-4"
                />
              </div>
              <div className="relative">
                <pre
                  className={cx(
                    'px-4',
                    'h-fit',
                    `${Typography.weight.normal} ${Typography.size.xs} `,
                  )}
                >
                  $ terraform plan
                </pre>
                <CopyToClipboardIcon
                  onClick={() => {
                    copyToClipboard('$ terraform plan');
                  }}
                  className="top-0"
                />
              </div>
              <div className="relative">
                <pre
                  className={cx(
                    'px-4',
                    'h-fit',
                    `${Typography.weight.normal} ${Typography.size.xs} `,
                  )}
                >
                  $ terraform apply
                </pre>
                <CopyToClipboardIcon
                  onClick={() => {
                    copyToClipboard('$ terraform apply');
                  }}
                  className="top-0"
                />
              </div>
            </Card>
            <div className="flex mt-6">
              <Button
                size="xs"
                color="primary"
                className="ml-auto"
                onClick={() => {
                  navigate('/onboard/scan-infrastructure/cloud/aws');
                }}
              >
                Go to connectors
              </Button>
            </div>
          </div>
        </Step>
      </Stepper>
    </div>
  );
});
