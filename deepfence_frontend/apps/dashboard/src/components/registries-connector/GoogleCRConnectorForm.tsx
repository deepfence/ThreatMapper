import { HiViewGridAdd } from 'react-icons/hi';
import { Card, FileInput, Step, Stepper, TextInput, Typography } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

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

export const GoogleCRConnectorForm = ({
  errorMessage,
  fieldErrors,
}: RegistryFormProps) => {
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
            placeholder="Registry Name" //TODO: double check this form
            color={fieldErrors?.['name'] ? 'error' : 'default'}
            helperText={fieldErrors?.['name']}
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry URL"
            type={'text'}
            sizing="sm"
            name="registry_url"
            placeholder="Registry URL"
            hint="e.g.: https://us.gcr.io"
            color={fieldErrors?.['registry_url'] ? 'error' : 'default'}
            helperText={fieldErrors?.['registry_url']}
          />
          <FileInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Select your file"
            hint="Please enable Cloud Resource Manager API and Container Registry API in Google Cloud"
            sizing="sm"
            name="service_account_json"
            helperText={fieldErrors?.['service_account_json']}
          />
          {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
        </Card>
      </Step>
    </Stepper>
  );
};
