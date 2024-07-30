import { Card, FileInput, TextInput } from 'ui-components';

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
      <div className="text-p4a text-text-input-value mt-1.5 mb-4">
        Connect to your Google Cloud Registry. Find out more information by{' '}
        <DFLink
          href={`https://community.deepfence.io/threatmapper/docs/v2.3/registries/`}
          target="_blank"
          rel="noreferrer"
        >
          reading our documentation
        </DFLink>
        .
      </div>
      <Card className="p-4">
        <p className="text-p1 text-text-input-value">Enter Information</p>
        <div className="w-full relative mt-4 flex flex-col gap-y-8">
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Registry Name"
            type={'text'}
            name="name"
            placeholder="Registry Name" //TODO: double check this form
            color={fieldErrors?.['name'] ? 'error' : 'default'}
            helperText={fieldErrors?.['name']}
            required
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
            required
          />
          <FileInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Select your file"
            hint="Please enable Cloud Resource Manager API and Container Registry API in Google Cloud"
            sizing="md"
            name="service_account_json"
            helperText={fieldErrors?.['service_account_json']}
          />
        </div>
        {errorMessage && <p className="mt-2 text-status-error text-p7">{errorMessage}</p>}
      </Card>
    </>
  );
};
