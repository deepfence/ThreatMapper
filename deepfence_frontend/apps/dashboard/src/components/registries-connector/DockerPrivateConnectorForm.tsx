import { useState } from 'react';
import { Card, Checkbox, TextInput } from 'ui-components';

import { DFLink } from '@/components/DFLink';
import { RegistryFormProps } from '@/features/common/data-component/RegistryConnectorForm';

/*
sample json
  {
    "name": "example_dockerprivate",
    "non_secret": {
      "docker_registry_url": "https://example.docker.com",
      "docker_username": "username"
    },
    "secret": {
      "docker_password": "password"
    },
    "registry_type": "docker_private_registry"
  }
*/

export const DockerPriavateConnectorForm = ({
  errorMessage,
  fieldErrors,
}: RegistryFormProps) => {
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
            name="non_secret.docker_registry_url"
            placeholder="Registry URL"
            color={fieldErrors?.['docker_registry_url'] ? 'error' : 'default'}
            helperText={fieldErrors?.['docker_registry_url']}
            required
          />

          <div className="flex">
            <input hidden value={String(isPublic)} name="non_secret.is_public" />
            <Checkbox
              label="Public Registry"
              checked={isPublic}
              onCheckedChange={(checked: boolean) => {
                setIsPublic(checked);
              }}
            />
          </div>
          {!isPublic && (
            <div className="flex flex-col gap-y-4">
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="Username"
                type={'text'}
                name="non_secret.docker_username"
                placeholder="Username"
                color={fieldErrors?.['docker_username'] ? 'error' : 'default'}
                helperText={fieldErrors?.['docker_username']}
                required
              />
              <TextInput
                className="w-3/4 min-[200px] max-w-xs"
                label="Password"
                type={'password'}
                name="secret.docker_password"
                placeholder="••••••••"
                color={fieldErrors?.['docker_password'] ? 'error' : 'default'}
                helperText={fieldErrors?.['docker_password']}
                required
              />
            </div>
          )}

          <div className="text-p7a text-text-input-value">
            Supported Versions: API version v2
          </div>
        </div>
        {errorMessage && (
          <p className="mt-2 text-status-error text-p7" data-testid="errorMessage">
            {errorMessage}
          </p>
        )}
      </Card>
    </>
  );
};
