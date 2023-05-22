import { HiViewGridAdd } from 'react-icons/hi';
import { Card, FileInput, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';

/*
sample json
  curl --request POST \
  --url https://xxx.xxx.xxx.xxx/deepfence/registryaccount/gcr \
  --header 'Authorization: Bearer' \
  --header 'content-type: multipart/form-data' \
  --form service_account_json=@service_account_json \
  --form name=test-gcr \
  --form registry_url=https://asia-south1-docker.pkg.dev
*/

export const GoogleCRConnectorForm = () => {
  return (
    <Stepper>
      <Step indicator={<HiViewGridAdd />} title="Google Registry Connection">
        <div className={`${Typography.size.sm} dark:text-gray-200`}>
          Connect to your Google Cloud Account. Find out more information by{' '}
          <DFLink
            href={`https://registry.terraform.io/modules/deepfence/cloud-scanner/gcp/latest/examples/single-project#usage`}
            target="_blank"
            rel="noreferrer"
          >
            reading our documentation
          </DFLink>
          .
        </div>
      </Step>
      <Step indicator="1" title="Region Selection">
        <Card className="w-full relative p-5 mt-2 flex flex-col gap-y-4">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            sizing="sm"
            name="name"
            placeholder="Registry Name"
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry URL"
            type={'text'}
            sizing="sm"
            name="registry_url"
            placeholder="Registry URL"
          />
          <FileInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Select your file"
            sizing="sm"
            name="service_account_json"
          />
        </Card>
      </Step>
    </Stepper>
  );
};
