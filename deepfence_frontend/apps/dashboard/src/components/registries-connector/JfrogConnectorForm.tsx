import { useState } from 'react';
import { Card, Checkbox, TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_jfrog",
    "non_secret": {
      "jfrog_registry_url": "https://example.jfrog.io",
      "jfrog_repository": "repository",
      "jfrog_username": "username"
    },
    "secret": {
      "jfrog_password": "password"
    },
    "registry_type": "jfrog_container_registry"
  }
*/

export const JfrogConnectorForm = ({ errorMessage, fieldErrors }: RegistryFormProps) => {
  const [isPublic, setIsPublic] = useState(false);

  return (
    <>
      <div className="text-p4a text-text-input-value mt-1.5 mb-4">
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
      <Card className="p-4">
        <p className="text-p1 text-text-input-value">Enter Information</p>
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
            info="e.g. https://jfrog.company.com"
            name="non_secret.jfrog_registry_url"
            placeholder="Registry URL"
            color={fieldErrors?.['jfrog_registry_url'] ? 'error' : 'default'}
            helperText={fieldErrors?.['jfrog_registry_url']}
            required
          />
          <TextInput
            className="w-3/4 min-[200px] max-w-xs"
            label="Repository"
            type={'text'}
            info="e.g. docker"
            name="non_secret.jfrog_repository"
            placeholder="Repository"
            color={fieldErrors?.['jfrog_repository'] ? 'error' : 'default'}
            helperText={fieldErrors?.['jfrog_repository']}
            required
          />
          <div>
            <input hidden value={String(isPublic)} />
            <Checkbox
              label="Public Registry"
              checked={isPublic}
              onCheckedChange={(checked: boolean) => {
                setIsPublic(checked);
              }}
            />
          </div>
          {!isPublic && (
            <>
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="Username"
                type={'text'}
                name="non_secret.jfrog_username"
                placeholder="Username"
                color={fieldErrors?.['jfrog_username'] ? 'error' : 'default'}
                helperText={fieldErrors?.['jfrog_username']}
              />
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="Password"
                type={'password'}
                name="secret.jfrog_password"
                placeholder="••••••••"
                color={fieldErrors?.['jfrog_password'] ? 'error' : 'default'}
                helperText={fieldErrors?.['jfrog_password']}
              />
            </>
          )}

          <div className="text-p7a text-text-input-value">
            Supported Versions: 6.19.1 and above
          </div>
        </div>
        {errorMessage && <p className="mt-2 text-status-error text-p7">{errorMessage}</p>}
      </Card>
    </>
  );
};
