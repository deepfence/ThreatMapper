import { FileInput, TextInput } from 'ui-components';

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
    <>
      <div className="text-p2 dark:text-text-input-value">
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
      <p className="mt-6 text-p1 dark:text-text-input-value">Enter Information</p>
      <div className="w-full relative p-4 mt-2 flex flex-col gap-y-8">
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Registry Name"
          type={'text'}
          name="name"
          placeholder="Registry Name" //TODO: double check this form
          color={fieldErrors?.['name'] ? 'error' : 'default'}
          helperText={fieldErrors?.['name']}
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Registry URL"
          type={'text'}
          name="registry_url"
          placeholder="Registry URL"
          info="e.g.: https://us.gcr.io"
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
        {errorMessage && <p className="dark:text-status-error text-p7">{errorMessage}</p>}
      </div>
    </>
  );
};
