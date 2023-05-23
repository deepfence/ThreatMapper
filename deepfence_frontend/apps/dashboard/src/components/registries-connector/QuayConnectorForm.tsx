import { HiViewGridAdd } from 'react-icons/hi';
import { Card, Step, Stepper, TextInput, Typography } from 'ui-components';

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
      <Stepper>
        <Step indicator={<HiViewGridAdd />} title="Quay Container Registry">
          <div className={`${Typography.size.sm} dark:text-gray-200`}>
            Using Certificate based Docker client Authentication? A custom certificate is
            configured by creating a directory under /etc/docker/certs.d on Deepfence
            console machine, using the same name as the registry&apos;s hostname provided
            above. All *.crt files are added to this directory as CA roots &nbsp;
            <DFLink
              href={`https://docs.docker.com/engine/security/certificates/`}
              target="_blank"
              rel="noreferrer"
            >
              reading our documentation
            </DFLink>
            .
          </div>
        </Step>
        <Step indicator="1" title="Enter Information">
          <Card className="w-full relative p-5 mt-2 flex flex-col gap-y-4">
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Registry Name"
              type={'text'}
              sizing="sm"
              name="name"
              placeholder="Registry Name"
              color={fieldErrors?.['name'] ? 'error' : 'default'}
              helperText={fieldErrors?.['name']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Registry URL"
              type={'text'}
              sizing="sm"
              name="non_secret.quay_registry_url"
              placeholder="Registry URL"
              color={fieldErrors?.['non_secret.quay_registry_url'] ? 'error' : 'default'}
              helperText={fieldErrors?.['non_secret.quay_registry_url']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="Namespace"
              type={'text'}
              sizing="sm"
              name="non_secret.quay_namespace"
              placeholder="Namespace"
              color={fieldErrors?.['non_secret.quay_namespace'] ? 'error' : 'default'}
              helperText={fieldErrors?.['non_secret.quay_namespace']}
            />
            <TextInput
              className="w-3/4 min-[200px] max-w-xs"
              label="OAuth 2 Access Token (Optional)"
              type={'password'}
              sizing="sm"
              name="secret.quay_access_token"
              placeholder="OAuth Access Token"
              color={fieldErrors?.['secret.quay_access_token'] ? 'error' : 'default'}
              helperText={fieldErrors?.['secret.quay_access_token']}
            />
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
          </Card>
        </Step>
      </Stepper>
    </>
  );
};
