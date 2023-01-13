import cx from 'classnames';
import { HiViewGridAdd } from 'react-icons/hi';
import { useCopyToClipboard } from 'react-use';
import { Button, Card, Step, Stepper, Typography } from 'ui-components';

import { CopyToClipboardIcon } from '../../../../../components/CopyToClipboardIcon';
import { usePageNavigation } from '../../../../../utils/usePageNavigation';

export const GCPConnectorForm = () => {
  const { navigate } = usePageNavigation();
  const [_, copyToClipboard] = useCopyToClipboard();

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
        version             = "0.1.0"
        mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
        mgmt-console-port   = "443"
        deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
      }
      `;

  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Teraform Cloud Formation.">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Google Cloud Account via Teraform. Find out more information by{' '}
          <a
            href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-500 mt-2"
          >
            reading our documentation
          </a>
          .
        </div>
      </Step>
      <Step indicator="1" title="Region Selection">
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
      <Step indicator="2" title="Deploy">
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
                terraform init
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
                terraform plan
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
                terraform apply
              </pre>
              <CopyToClipboardIcon
                onClick={() => {
                  copyToClipboard('$ terraform apply');
                }}
                className="top-0"
              />
            </div>
          </Card>
          <div className="flex flex-col mt-6">
            <p className={`${Typography.size.xs}`}>
              Note: After successfully run the commands above, your connector will appear
              on MyConnector page, then you can perform scanning.
            </p>
            <Button
              size="xs"
              color="primary"
              className="ml-auto"
              onClick={() => {
                navigate('/onboard/my-connectors');
              }}
            >
              Go to connectors
            </Button>
          </div>
        </div>
      </Step>
    </Stepper>
  );
};
