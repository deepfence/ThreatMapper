import { TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_quay",
    "non_secret": {
      "quay_namespace": "namespace",
      "quay_registry_url": "https://quay.io"
    },
    "secret": {
      "quay_access_token": "access_token"
    },
    "registry_type": "quay"
  }
*/

export const QuayConnectorForm = ({ errorMessage, fieldErrors }: RegistryFormProps) => {
  return (
    <>
      <div className="text-p4 dark:text-text-input-value">
        Using Certificate based Docker client Authentication? A custom certificate is
        configured by creating a directory under /etc/docker/certs.d on Deepfence console
        machine, using the same name as the registry&apos;s hostname provided above. All
        *.crt files are added to this directory as CA roots &nbsp;
        <DFLink
          href={`https://docs.docker.com/engine/security/certificates/`}
          target="_blank"
          rel="noreferrer"
        >
          More information
        </DFLink>
        .
      </div>
      <p className="mt-6 text-p1 dark:text-text-input-value">Enter Information</p>
      <div className="w-full relative mt-4 flex flex-col gap-y-8">
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Registry Name"
          type={'text'}
          name="name"
          placeholder="Registry Name"
          color={fieldErrors?.['name'] ? 'error' : 'default'}
          helperText={fieldErrors?.['name']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Registry URL"
          type={'text'}
          info="e.g. https://quay.io"
          name="non_secret.quay_registry_url"
          placeholder="Registry URL"
          color={fieldErrors?.['quay_registry_url'] ? 'error' : 'default'}
          helperText={fieldErrors?.['quay_registry_url']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="Namespace"
          type={'text'}
          info="Organization name"
          name="non_secret.quay_namespace"
          placeholder="Namespace"
          color={fieldErrors?.['quay_namespace'] ? 'error' : 'default'}
          helperText={fieldErrors?.['quay_namespace']}
          required
        />
        <TextInput
          className="w-3/4 min-[200px] max-w-xs"
          label="OAuth 2 Access Token (Optional)"
          type={'password'}
          info="(Optional) It is needed only for private images"
          name="secret.quay_access_token"
          placeholder="OAuth Access Token"
          color={fieldErrors?.['quay_access_token'] ? 'error' : 'default'}
          helperText={fieldErrors?.['quay_access_token']}
        />

        {errorMessage && (
          <p className="mt-4 dark:text-status-error text-p7">{errorMessage}</p>
        )}
      </div>
    </>
  );
};
