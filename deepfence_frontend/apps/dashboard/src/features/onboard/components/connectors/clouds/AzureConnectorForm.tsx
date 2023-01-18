import cx from 'classnames';
import { HiViewGridAdd } from 'react-icons/hi';
import { Button, Card, Step, Stepper, Typography } from 'ui-components';

import { CopyToClipboardIcon } from '../../../../../components/CopyToClipboardIcon';
import { usePageNavigation } from '../../../../../utils/usePageNavigation';

export const AzureConnectorForm = () => {
  const { navigate } = usePageNavigation();

  const code = `provider "azurerm" {
    features {}
    subscription_id = "<SUBSCRIPTION_ID eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX>"
  }
  
  module "cloud-scanner_example_single-subscription" {
    source              = "deepfence/cloud-scanner/azure//examples/single-subscription"
    version             = "0.1.0"
    mgmt-console-url    = "<Console URL> eg. XXX.XXX.XX.XXX"
    mgmt-console-port   = "443"
    deepfence-key       = "<Deepfence-key> eg. XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
  }
  `;

  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Teraform Cloud Formation">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Azure Cloud Account via Teraform. Find out more information by{' '}
          <a
            href={`https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/site_recovery_replicated_vm`}
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
            <CopyToClipboardIcon text={code} />
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
              <CopyToClipboardIcon text={'terraform init'} className="top-4" />
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
              <CopyToClipboardIcon text={'terraform plan'} className="top-0" />
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
              <CopyToClipboardIcon text={'terraform apply'} className="top-0" />
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
                navigate('/onboard/connectors/my-connectors');
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
